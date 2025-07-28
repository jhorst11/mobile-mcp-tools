/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceManager } from '../../src/utils/deviceManager.js';
import { CommandRunner } from '../../src/utils/commandRunner.js';

describe('DeviceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listIOSSimulators', () => {
    it('should parse iOS simulator list correctly', async () => {
      const mockSimctlOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              udid: '12345678-1234-1234-1234-123456789012',
              name: 'iPhone 14',
              state: 'Shutdown',
              isAvailable: true,
            },
            {
              udid: '87654321-4321-4321-4321-210987654321',
              name: 'iPhone 14 Pro',
              state: 'Booted',
              isAvailable: true,
            },
          ],
        },
      });

      vi.spyOn(CommandRunner, 'run').mockResolvedValue({
        success: true,
        stdout: mockSimctlOutput,
        stderr: '',
        exitCode: 0,
        command: 'xcrun simctl list devices --json',
      });

      const devices = await DeviceManager.listIOSSimulators();

      expect(devices).toHaveLength(2);
      expect(devices[0]).toEqual({
        id: '12345678-1234-1234-1234-123456789012',
        name: 'iPhone 14',
        platform: 'ios',
        osVersion: '17.0',
        state: 'shutdown',
        available: true,
      });
      expect(devices[1]).toEqual({
        id: '87654321-4321-4321-4321-210987654321',
        name: 'iPhone 14 Pro',
        platform: 'ios',
        osVersion: '17.0',
        state: 'booted',
        available: true,
      });
    });

    it('should handle iOS simulator list failure', async () => {
      vi.spyOn(CommandRunner, 'run').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
        command: 'xcrun simctl list devices --json',
      });

      await expect(DeviceManager.listIOSSimulators()).rejects.toThrow(
        'Failed to list iOS simulators'
      );
    });
  });

  describe('listAndroidEmulators', () => {
    it('should parse Android emulator list correctly', async () => {
      vi.spyOn(CommandRunner, 'run')
        .mockResolvedValueOnce({
          success: true,
          stdout: 'Pixel_4_API_30\nPixel_6_API_33',
          stderr: '',
          exitCode: 0,
          command: 'emulator -list-avds',
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'List of devices attached\nemulator-5554\tdevice',
          stderr: '',
          exitCode: 0,
          command: 'adb devices',
        });

      const devices = await DeviceManager.listAndroidEmulators();

      expect(devices).toHaveLength(2);
      expect(devices[0].name).toBe('Pixel_4_API_30');
      expect(devices[0].platform).toBe('android');
      expect(devices[1].name).toBe('Pixel_6_API_33');
      expect(devices[1].platform).toBe('android');
    });

    it('should handle Android emulator list failure', async () => {
      vi.spyOn(CommandRunner, 'run').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
        command: 'emulator -list-avds',
      });

      await expect(DeviceManager.listAndroidEmulators()).rejects.toThrow(
        'Failed to list Android AVDs'
      );
    });
  });

  describe('startIOSSimulator', () => {
    it('should start an iOS simulator successfully', async () => {
      // Mock listing simulators
      const mockSimctlOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              udid: '12345678-1234-1234-1234-123456789012',
              name: 'iPhone 14',
              state: 'Shutdown',
              isAvailable: true,
            },
          ],
        },
      });

      vi.spyOn(CommandRunner, 'run')
        .mockResolvedValueOnce({
          success: true,
          stdout: mockSimctlOutput,
          stderr: '',
          exitCode: 0,
          command: 'xcrun simctl list devices --json',
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          command: 'xcrun simctl boot 12345678-1234-1234-1234-123456789012',
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: JSON.stringify({
            devices: {
              'iOS 17.0': [
                {
                  udid: '12345678-1234-1234-1234-123456789012',
                  name: 'iPhone 14',
                  state: 'Booted',
                  isAvailable: true,
                },
              ],
            },
          }),
          stderr: '',
          exitCode: 0,
          command: 'xcrun simctl list devices --json',
        });

      const result = await DeviceManager.startIOSSimulator('iPhone 14');

      expect(result.deviceId).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.deviceName).toBe('iPhone 14');
    });

    it('should return immediately if simulator is already booted', async () => {
      const mockSimctlOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              udid: '12345678-1234-1234-1234-123456789012',
              name: 'iPhone 14',
              state: 'Booted',
              isAvailable: true,
            },
          ],
        },
      });

      vi.spyOn(CommandRunner, 'run').mockResolvedValue({
        success: true,
        stdout: mockSimctlOutput,
        stderr: '',
        exitCode: 0,
        command: 'xcrun simctl list devices --json',
      });

      const result = await DeviceManager.startIOSSimulator('iPhone 14');

      expect(result.deviceId).toBe('12345678-1234-1234-1234-123456789012');
      expect(result.deviceName).toBe('iPhone 14');
    });
  });

  describe('startAndroidEmulator', () => {
    it('should handle errors when starting emulator', async () => {
      vi.spyOn(CommandRunner, 'run').mockRejectedValue(new Error('Emulator not found'));

      await expect(DeviceManager.startAndroidEmulator('NonExistentEmulator')).rejects.toThrow(
        'Failed to start Android emulator'
      );
    });
  });

  describe('listDevices', () => {
    it('should list devices for all platforms', async () => {
      // Mock iOS simulators
      vi.spyOn(CommandRunner, 'run')
        .mockResolvedValueOnce({
          success: true,
          stdout: JSON.stringify({
            devices: {
              'iOS 17.0': [
                {
                  udid: '12345678-1234-1234-1234-123456789012',
                  name: 'iPhone 14',
                  state: 'Shutdown',
                  isAvailable: true,
                },
              ],
            },
          }),
          stderr: '',
          exitCode: 0,
          command: 'xcrun simctl list devices --json',
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'Pixel_4_API_30',
          stderr: '',
          exitCode: 0,
          command: 'emulator -list-avds',
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'List of devices attached',
          stderr: '',
          exitCode: 0,
          command: 'adb devices',
        });

      const devices = await DeviceManager.listDevices('all');

      expect(devices.length).toBeGreaterThan(0);
      expect(devices.some(d => d.platform === 'ios')).toBe(true);
      expect(devices.some(d => d.platform === 'android')).toBe(true);
    });
  });
});
