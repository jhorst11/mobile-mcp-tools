/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PropertyMetadataCollection } from '../../common/propertyMetadata.js';

/**
 * Input gathering strategy types
 */

/**
 * Single Property Strategy - Focus on one complex property at a time
 */
export interface SinglePropertyStrategy {
  type: 'single';
  /** The property to collect */
  propertyName: string;
}

/**
 * Multiple Properties Strategy - Collect several related properties in one interaction
 */
export interface MultiplePropertiesStrategy {
  type: 'multiple';
  /** The properties to collect together */
  propertyNames: string[];
  /** Optional group label for the properties */
  groupLabel?: string;
}

/**
 * Choice for choice selection strategy
 */
export interface InputChoice {
  /** Display label for the choice */
  label: string;
  /** Actual value to use if selected */
  value: unknown;
  /** Optional description of what this choice means */
  description?: string;
}

/**
 * Choice Selection Strategy - Present predefined options with optional custom input
 */
export interface ChoiceSelectionStrategy {
  type: 'choice';
  /** The property to collect */
  propertyName: string;
  /** Predefined options to choose from */
  choices: InputChoice[];
  /** Whether user can provide custom value */
  allowCustom: boolean;
  /** Default choice if any */
  defaultChoice?: string;
}

/**
 * Confirmation Strategy - Yes/no questions with defaults
 */
export interface ConfirmationStrategy {
  type: 'confirmation';
  /** The property to collect (typically boolean) */
  propertyName: string;
  /** The question to ask */
  question: string;
  /** Default value if user just confirms */
  defaultValue?: boolean;
}

/**
 * Union type of all input gathering strategies
 */
export type InputGatheringStrategy =
  | SinglePropertyStrategy
  | MultiplePropertiesStrategy
  | ChoiceSelectionStrategy
  | ConfirmationStrategy;

/**
 * Input Request Context - Describes what information is needed and how to gather it
 */
export interface InputRequestContext {
  /** Properties that need to be collected */
  properties: PropertyMetadataCollection;

  /** Why these properties are needed (for context in prompts) */
  purpose: string;

  /** Suggested gathering strategy (if not provided, will be auto-selected) */
  strategy?: InputGatheringStrategy;

  /** Context from current workflow state */
  workflowContext?: Record<string, unknown>;

  /** Whether to allow partial responses */
  allowPartial?: boolean;

  /** Maximum interaction rounds before giving up */
  maxRounds?: number;
}

/**
 * Input Response - Structured result from user interaction
 */
export interface InputResponse {
  /** Properties successfully collected */
  collectedProperties: Record<string, unknown>;

  /** Properties that are still missing */
  missingProperties: string[];

  /** Whether user explicitly cancelled/skipped */
  userCancelled: boolean;

  /** Number of interaction rounds used */
  roundsUsed: number;

  /** Whether all required properties were collected */
  complete: boolean;
}

/**
 * Property definition for tool input (simplified from PropertyMetadata)
 */
export const PropertyDefinitionSchema = z.object({
  name: z.string().describe('The property name'),
  friendlyName: z.string().describe('Human-readable name'),
  description: z.string().describe('Property description'),
  examples: z.array(z.string()).optional().describe('Example values'),
});

export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;

/**
 * Strategy schemas for tool input
 */
export const SinglePropertyStrategySchema = z.object({
  type: z.literal('single'),
  property: PropertyDefinitionSchema,
});

export const MultiplePropertiesStrategySchema = z.object({
  type: z.literal('multiple'),
  properties: z.array(PropertyDefinitionSchema),
  groupLabel: z.string().optional(),
});

export const ChoiceSelectionStrategySchema = z.object({
  type: z.literal('choice'),
  property: PropertyDefinitionSchema,
  choices: z.array(
    z.object({
      label: z.string(),
      value: z.unknown(),
      description: z.string().optional(),
    })
  ),
  allowCustom: z.boolean(),
  defaultChoice: z.string().optional(),
});

export const ConfirmationStrategySchema = z.object({
  type: z.literal('confirmation'),
  property: z.object({
    name: z.string(),
    friendlyName: z.string(),
  }),
  question: z.string(),
  defaultValue: z.boolean().optional(),
});

/**
 * Union schema for all strategies
 */
export const InputGatheringStrategySchema = z.discriminatedUnion('type', [
  SinglePropertyStrategySchema,
  MultiplePropertiesStrategySchema,
  ChoiceSelectionStrategySchema,
  ConfirmationStrategySchema,
]);
