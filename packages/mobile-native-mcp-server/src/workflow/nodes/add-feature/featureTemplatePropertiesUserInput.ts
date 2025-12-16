/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createGetUserInputNode, PropertyMetadataCollection } from '@salesforce/magen-mcp-workflow';
import { AddFeatureState } from '../../add-feature-metadata.js';
import { SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID } from '../../../tools/utils/sfmobile-native-add-feature-get-input/metadata.js';
import z from 'zod';

/**
 * Custom node that prompts for template-specific properties
 * based on templatePropertiesMetadata in state (after filtering for missing properties)
 */
export class FeatureTemplatePropertiesUserInputNode {
  name = 'getFeatureTemplatePropertiesInput';

  execute = (state: AddFeatureState): Partial<AddFeatureState> => {
    // If no template properties metadata exists, skip input gathering
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      return {};
    }

    // Only prompt for properties that are required and don't have values yet
    const requiredProperties: PropertyMetadataCollection = {};

    for (const [propertyName, metadata] of Object.entries(state.templatePropertiesMetadata)) {
      // Only include properties that are required and don't have a value yet
      if (metadata.required && !state.templateProperties?.[propertyName]) {
        requiredProperties[propertyName] = {
          zodType: z.string(),
          description: metadata.description,
          friendlyName: propertyName,
        };
      }
    }

    // If no required properties are left to collect, return empty
    if (Object.keys(requiredProperties).length === 0) {
      return {};
    }

    // Create and execute the user input node with the dynamic properties
    const userInputNode = createGetUserInputNode<AddFeatureState>({
      requiredProperties,
      toolId: SFMOBILE_NATIVE_ADD_FEATURE_GET_INPUT_TOOL_ID,
      userInputProperty: 'templatePropertiesUserInput',
    });

    // Execute the user input node
    return userInputNode.execute(state);
  };
}
