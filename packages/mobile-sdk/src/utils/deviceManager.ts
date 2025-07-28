/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { CommandRunner } from './commandRunner.js';
import type { DeviceInfoType } from '../schemas/mobileSdkSchema.js';

export class DeviceManager {
  /**
   * List all available iOS simulators
   */
  static async listIOSSimulators(): Promise<DeviceInfoType[]> {
    try {
      const result = await CommandRunner.run('xcrun', ['simctl', 'list', 'devices', '--json']);

      if (!result.success) {
        throw new Error(`Failed to list iOS simulators: ${result.stderr}`);
      }

      const data = JSON.parse(result.stdout);
      const devices: DeviceInfoType[] = [];

      // Parse the simulator list
      for (const [runtimeName, deviceList] of Object.entries(data.devices)) {
        if (Array.isArray(deviceList)) {
          for (const device of deviceList) {
            const typedDevice = device as {
              udid: string;
              name: string;
              state: string;
              isAvailable?: boolean;
            };

            // Extract iOS version from runtime name (e.g., "iOS 17.0" -> "17.0")
            const versionMatch = runtimeName.match(/iOS (\d+\.\d+)/);
            const osVersion = versionMatch ? versionMatch[1] : 'Unknown';

            devices.push({
              id: typedDevice.udid,
              name: typedDevice.name,
              platform: 'ios',
              osVersion,
              state: this.normalizeDeviceState(typedDevice.state),
              available: typedDevice.isAvailable !== false,
            });
          }
        }
      }

      return devices;
    } catch (error) {
      throw new Error(
        `Failed to list iOS simulators: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List all available Android emulators
   */
  static async listAndroidEmulators(): Promise<DeviceInfoType[]> {
    try {
      // First, get list of available AVDs
      const avdResult = await CommandRunner.run('emulator', ['-list-avds']);

      if (!avdResult.success) {
        throw new Error(`Failed to list Android AVDs: ${avdResult.stderr}`);
      }

      const avdNames = avdResult.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const devices: DeviceInfoType[] = [];

      // Get running emulators
      const runningResult = await CommandRunner.run('adb', ['devices']);
      const runningDevices = new Set<string>();

      if (runningResult.success) {
        const lines = runningResult.stdout.split('\n');
        for (const line of lines) {
          if (line.includes('emulator-') && line.includes('device')) {
            const deviceId = line.split('\t')[0];
            runningDevices.add(deviceId);
          }
        }
      }

      // For each AVD, get its details
      for (const avdName of avdNames) {
        try {
          const configResult = await CommandRunner.run('emulator', ['-avd', avdName, '-info']);

          let osVersion = 'Unknown';
          if (configResult.success) {
            // Extract Android version from emulator info
            const versionMatch = configResult.stdout.match(/API Level:\s*(\d+)/);
            if (versionMatch) {
              osVersion = this.apiLevelToAndroidVersion(parseInt(versionMatch[1]));
            }
          }

          // Generate a device ID for the AVD (emulators use dynamic ports)
          const deviceId = `emulator-${avdName}`;
          const isRunning = Array.from(runningDevices).some(id => id.includes(avdName));

          devices.push({
            id: deviceId,
            name: avdName,
            platform: 'android',
            osVersion,
            state: isRunning ? 'booted' : 'shutdown',
            available: true,
          });
        } catch {
          // If we can't get info for a specific AVD, still include it
          devices.push({
            id: `emulator-${avdName}`,
            name: avdName,
            platform: 'android',
            osVersion: 'Unknown',
            state: 'shutdown',
            available: true,
          });
        }
      }

      return devices;
    } catch (error) {
      throw new Error(
        `Failed to list Android emulators: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List all devices for the specified platform(s)
   */
  static async listDevices(
    platform: 'ios' | 'android' | 'all' = 'all',
    availableOnly = true
  ): Promise<DeviceInfoType[]> {
    const devices: DeviceInfoType[] = [];

    if (platform === 'ios' || platform === 'all') {
      try {
        const iosDevices = await this.listIOSSimulators();
        devices.push(...iosDevices);
      } catch (error) {
        // If iOS tools aren't available (e.g., on non-macOS), continue
        if (platform === 'ios') {
          throw error;
        }
      }
    }

    if (platform === 'android' || platform === 'all') {
      try {
        const androidDevices = await this.listAndroidEmulators();
        devices.push(...androidDevices);
      } catch (error) {
        // If Android tools aren't available, continue
        if (platform === 'android') {
          throw error;
        }
      }
    }

    return availableOnly ? devices.filter(device => device.available) : devices;
  }

  /**
   * Start an iOS simulator
   */
  static async startIOSSimulator(
    deviceName: string,
    osVersion?: string
  ): Promise<{ deviceId: string; deviceName: string }> {
    try {
      // First, find the device
      const devices = await this.listIOSSimulators();
      let targetDevice = devices.find(
        device => device.name === deviceName && (osVersion ? device.osVersion === osVersion : true)
      );

      if (!targetDevice) {
        // If not found with exact name, try partial match
        targetDevice = devices.find(
          device =>
            device.name.includes(deviceName) && (osVersion ? device.osVersion === osVersion : true)
        );
      }

      if (!targetDevice) {
        throw new Error(
          `iOS simulator not found: ${deviceName}${osVersion ? ` (iOS ${osVersion})` : ''}`
        );
      }

      // Check if already booted
      if (targetDevice.state === 'booted') {
        return {
          deviceId: targetDevice.id,
          deviceName: targetDevice.name,
        };
      }

      // Boot the simulator
      const bootResult = await CommandRunner.run('xcrun', ['simctl', 'boot', targetDevice.id]);

      if (!bootResult.success) {
        throw new Error(`Failed to boot iOS simulator: ${bootResult.stderr}`);
      }

      // Wait for the simulator to boot (with timeout)
      const maxWaitTime = 60000; // 60 seconds
      const checkInterval = 2000; // 2 seconds
      let waited = 0;

      while (waited < maxWaitTime) {
        const devices = await this.listIOSSimulators();
        const device = devices.find(d => d.id === targetDevice!.id);

        if (device?.state === 'booted') {
          return {
            deviceId: targetDevice.id,
            deviceName: targetDevice.name,
          };
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      throw new Error('Timeout waiting for iOS simulator to boot');
    } catch (error) {
      throw new Error(
        `Failed to start iOS simulator: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start an Android emulator
   */
  static async startAndroidEmulator(
    deviceName: string
  ): Promise<{ deviceId: string; deviceName: string }> {
    try {
      // Check if emulator is already running
      const devices = await this.listAndroidEmulators();
      const existingDevice = devices.find(
        device => device.name === deviceName && device.state === 'booted'
      );

      if (existingDevice) {
        return {
          deviceId: existingDevice.id,
          deviceName: existingDevice.name,
        };
      }

      // Start the emulator
      await CommandRunner.run('emulator', ['-avd', deviceName, '-no-window'], {
        timeout: 10000, // Give it 10 seconds to start
      });

      // Note: emulator command typically returns immediately, so we don't check success
      // Instead, we wait and check if it appears in the device list

      // Wait for the emulator to show up (with timeout)
      const maxWaitTime = 120000; // 2 minutes
      const checkInterval = 5000; // 5 seconds
      let waited = 0;

      while (waited < maxWaitTime) {
        const runningResult = await CommandRunner.run('adb', ['devices']);

        if (runningResult.success) {
          const lines = runningResult.stdout.split('\n');
          for (const line of lines) {
            if (line.includes('emulator-') && line.includes('device')) {
              const deviceId = line.split('\t')[0];
              return {
                deviceId,
                deviceName,
              };
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      throw new Error('Timeout waiting for Android emulator to start');
    } catch (error) {
      throw new Error(
        `Failed to start Android emulator: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start a device based on platform
   */
  static async startDevice(
    deviceName: string,
    platform: 'ios' | 'android',
    osVersion?: string
  ): Promise<{ deviceId: string; deviceName: string; platform: string }> {
    if (platform === 'ios') {
      const result = await this.startIOSSimulator(deviceName, osVersion);
      return { ...result, platform: 'ios' };
    } else if (platform === 'android') {
      const result = await this.startAndroidEmulator(deviceName);
      return { ...result, platform: 'android' };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Normalize device state to our standard enum
   */
  private static normalizeDeviceState(
    state: string
  ): 'booted' | 'shutdown' | 'creating' | 'booting' | 'shutting-down' {
    const lowerState = state.toLowerCase();

    if (lowerState.includes('booted')) return 'booted';
    if (lowerState.includes('shutdown') || lowerState.includes('unavailable')) return 'shutdown';
    if (lowerState.includes('creating')) return 'creating';
    if (lowerState.includes('booting')) return 'booting';
    if (lowerState.includes('shutting')) return 'shutting-down';

    return 'shutdown'; // Default
  }

  /**
   * Convert Android API level to version string
   */
  private static apiLevelToAndroidVersion(apiLevel: number): string {
    const versionMap: Record<number, string> = {
      34: '14.0',
      33: '13.0',
      32: '12L',
      31: '12.0',
      30: '11.0',
      29: '10.0',
      28: '9.0',
      27: '8.1',
      26: '8.0',
      25: '7.1',
      24: '7.0',
      23: '6.0',
    };

    return versionMap[apiLevel] || `API ${apiLevel}`;
  }
}
