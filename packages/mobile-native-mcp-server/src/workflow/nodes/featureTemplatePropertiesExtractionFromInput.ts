/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  createUserInputExtractionNode,
  PropertyMetadataCollection,
} from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../add-feature-metadata.js';
import { SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID } from '../../tools/utils/sfmobile-native-add-feature-input-extraction/metadata.js';
import z from 'zod';

/**
 * Custom node that converts template properties metadata to PropertyMetadataCollection
 * and then extracts properties from user input
 */
export class FeatureTemplatePropertiesExtractionFromInputNode {
  name = 'extractFeatureTemplatePropertiesFromInput';

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // If no template properties metadata exists, skip extraction
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      return { templateProperties: {} };
    }

    // If templatePropertiesUserInput doesn't exist yet, don't initialize templateProperties
    // This allows the router to route to templatePropertiesUserInputNode to prompt for input
    if (!state.templatePropertiesUserInput) {
      return {};
    }

    // Convert template properties metadata to PropertyMetadataCollection format
    const requiredProperties: PropertyMetadataCollection = {};

    for (const [propertyName, metadata] of Object.entries(state.templatePropertiesMetadata)) {
      requiredProperties[propertyName] = {
        zodType: z.string(),
        description: metadata.description,
        friendlyName: propertyName,
      };
    }

    // Create and execute the extraction node with the dynamic properties
    const extractionNode = createUserInputExtractionNode<AddFeatureState>({
      requiredProperties,
      toolId: SFMOBILE_NATIVE_ADD_FEATURE_INPUT_EXTRACTION_TOOL_ID,
      userInputProperty: 'templatePropertiesUserInput',
    });

    // Execute the extraction and map results to templateProperties
    const result = extractionNode.execute(state);

    // Convert extracted properties to Record<string, string> format
    // Merge with existing templateProperties if they exist
    const templateProperties: Record<string, string> = { ...(state.templateProperties || {}) };
    const resultRecord = result as Record<string, unknown>;
    for (const key of Object.keys(requiredProperties)) {
      const value = resultRecord[key];
      if (value && typeof value === 'string') {
        templateProperties[key] = value;
      }
    }

    return { templateProperties };
  };
}
