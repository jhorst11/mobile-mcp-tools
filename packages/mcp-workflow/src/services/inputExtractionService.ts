/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { NodeExecutor } from '../nodes/toolExecutor.js';
import { AbstractService } from './abstractService.js';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import { Logger } from '../logging/logger.js';
import { NodeGuidanceData } from '../common/metadata.js';

/**
 * Result from property extraction containing validated properties.
 */
export interface ExtractionResult {
  /** Record of extracted properties, keyed by property name */
  extractedProperties: Record<string, unknown>;
}

/**
 * Provider interface for property extraction service.
 * This interface allows for dependency injection and testing.
 */
export interface InputExtractionServiceProvider {
  /**
   * Extracts structured properties from user input.
   *
   * @param userInput - Raw user input (string, object, or any format)
   * @param properties - Collection of properties to extract with their metadata
   * @returns ExtractionResult containing validated extracted properties
   */
  extractProperties(userInput: unknown, properties: PropertyMetadataCollection): ExtractionResult;
}

/**
 * Service for extracting structured properties from user input.
 *
 * This service extends AbstractService to leverage common execution
 * patterns including standardized logging and result validation.
 *
 * Now uses the new guidance-based architecture instead of separate tool invocation.
 */
export class InputExtractionService
  extends AbstractService
  implements InputExtractionServiceProvider
{
  /**
   * Creates a new InputExtractionService.
   *
   * @param toolId - Tool ID for the input extraction tool (for backward compatibility)
   * @param nodeExecutor - Node executor for invoking with guidance (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(
    private readonly toolId: string,
    nodeExecutor?: NodeExecutor,
    logger?: Logger
  ) {
    super('InputExtractionService', nodeExecutor, logger);
  }

  extractProperties(userInput: unknown, properties: PropertyMetadataCollection): ExtractionResult {
    this.logger.debug('Starting property extraction', {
      userInput,
      propertyCount: Object.keys(properties).length,
    });

    const propertiesToExtract = this.preparePropertiesForExtraction(properties);
    const resultSchema = this.preparePropertyResultsSchema(properties);

    // Create guidance data (new architecture)
    const guidanceData: NodeGuidanceData = {
      nodeId: 'inputExtraction',
      taskPrompt: this.generateInputExtractionGuidance(userInput, propertiesToExtract),
      taskInput: {
        userUtterance: userInput,
        propertiesToExtract,
        resultSchema: JSON.stringify(zodToJsonSchema(resultSchema)),
      },
      resultSchema,
      metadata: {
        nodeName: 'inputExtraction',
        description: 'Extract structured properties from user input',
      },
    };

    const validatedResult = this.executeNodeWithLogging(
      guidanceData,
      resultSchema,
      (rawResult, schema) => this.validateAndFilterResult(rawResult, properties, schema)
    );

    this.logger.info('Property extraction completed', {
      extractedCount: Object.keys(validatedResult.extractedProperties).length,
      properties: Object.keys(validatedResult.extractedProperties),
    });

    return validatedResult;
  }

  /**
   * Generate the task prompt for input extraction
   * This is the guidance that was previously in the InputExtractionTool
   */
  private generateInputExtractionGuidance(
    userUtterance: unknown,
    propertiesToExtract: Array<{ propertyName: string; description: string }>
  ): string {
    return `
# ROLE
You are a highly accurate and precise data extraction tool.

# TASK

Your task is to analyze a user utterance and extract values for a given list of properties.
For each property you are asked to find, you must provide its extracted value or \`null\`
if no value is found.

---
# CONTEXT

## USER UTTERANCE TO ANALYZE
${JSON.stringify(userUtterance)}

## PROPERTIES TO EXTRACT
Here is the list of properties you need to find values for. Use each property's description
to understand what to look for.

\`\`\`json
${JSON.stringify(propertiesToExtract, null, 2)}
\`\`\`

---
# INSTRUCTIONS
1. Carefully read the "USER UTTERANCE TO ANALYZE".
2. For each property listed in "PROPERTIES TO EXTRACT", search the text for a  
   corresponding value.
3. If a clear value is found for a property, place it in your output.
4. If a property's value is not ABSOLUTELY INFERABLE from USER UTTERANCE TO ANALYZE, you
   MUST use \`null\` as the value for that property. You MAY NOT infer your own property
   values, in the absence of their clear specification in the USER UTTERANCE TO ANALYZE.
5. Ensure the keys in your output JSON object exactly match the \`propertyName\` values  
   from the input list.
6. The exact format of your output object will be given in the section below.
`;
  }

  private preparePropertiesForExtraction(
    properties: PropertyMetadataCollection
  ): Array<{ propertyName: string; description: string }> {
    const propertiesToExtract: Array<{ propertyName: string; description: string }> = [];

    for (const [propertyName, metadata] of Object.entries(properties)) {
      propertiesToExtract.push({
        propertyName,
        description: metadata.description,
      });
    }

    this.logger.debug('Prepared properties for extraction', {
      count: propertiesToExtract.length,
      properties: propertiesToExtract.map(p => p.propertyName),
    });

    return propertiesToExtract;
  }

  private preparePropertyResultsSchema(
    properties: PropertyMetadataCollection
  ): z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }> {
    const extractedPropertiesShape: Record<string, z.ZodType> = {};

    for (const [propertyName, metadata] of Object.entries(properties)) {
      extractedPropertiesShape[propertyName] = metadata.zodType
        .describe(metadata.description)
        .nullable()
        .catch((ctx: { input: unknown }) => ctx.input);
    }

    return z.object({ extractedProperties: z.object(extractedPropertiesShape).passthrough() });
  }

  private validateAndFilterResult(
    rawResult: unknown,
    properties: PropertyMetadataCollection,
    resultSchema: z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }>
  ): ExtractionResult {
    const structureValidated = resultSchema.parse(rawResult);
    const { extractedProperties } = structureValidated;

    this.logger.debug('Validating extracted properties', {
      extractedProperties,
    });

    const validatedProperties: Record<string, unknown> = {};
    const invalidProperties: string[] = [];

    for (const [propertyName, propertyValue] of Object.entries(extractedProperties)) {
      if (propertyValue == null) {
        this.logger.debug(`Skipping property with null/undefined value`, { propertyName });
        continue;
      }

      const propertyMetadata = properties[propertyName];
      if (!propertyMetadata) {
        this.logger.warn(`Unknown property in extraction result`, { propertyName });
        continue;
      }

      try {
        const validatedValue = propertyMetadata.zodType.parse(propertyValue);
        validatedProperties[propertyName] = validatedValue;
        this.logger.debug(`Property validated successfully`, {
          propertyName,
          value: validatedValue,
        });
      } catch (error) {
        invalidProperties.push(propertyName);
        if (error instanceof z.ZodError) {
          this.logger.debug(`Property validation failed`, {
            propertyName,
            value: propertyValue,
            errors: error.errors,
          });
        } else {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Unexpected validation error for ${propertyName}: ${errorMsg}`);
          throw error;
        }
      }
    }

    if (invalidProperties.length > 0) {
      this.logger.info(`Some properties failed validation`, {
        invalidProperties,
        validCount: Object.keys(validatedProperties).length,
      });
    }

    return { extractedProperties: validatedProperties };
  }
}
