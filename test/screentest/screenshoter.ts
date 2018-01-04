import { getClient } from '../helpers/api-client';
import { CustomizationService } from '../../app/services/customization';
import { execSync } from 'child_process';
import { getConfigsVariations, getConfig } from './utils';
import test from 'ava';
import { sleep } from '../helpers/sleep';
import { focusChild } from '../helpers/spectron/index';

const fs = require('fs');
const CONFIG = getConfig();
let configs: Dictionary<any>[];

let branchName: string;


export async function applyConfig(t: any, config: Dictionary<any>) {
  const api = await getClient();
  const customizationService = api.getResource<CustomizationService>('CustomizationService');

  customizationService.setNightMode(config.nightMode);

  t.context.app.browserWindow.setSize(
    config.resolution.width, config.resolution.height
  );

  await sleep(400);
}


export async function makeScreenshots(t: any, options: IScreentestOptions) {

  if (options.window === 'child') {
    await focusChild(t);
  }

  configs = getConfigsVariations();
  const processedConfigs: string[] = [];

  for (let configInd = 0; configInd < configs.length; configInd++) {
    const config = configs[configInd];

    for (const paramName in config) {
      if (
        CONFIG.configs[paramName].window &&
        CONFIG.configs[paramName].window !== options.window
      ) delete config[paramName];
    }

    const configStr = JSON.stringify(config);
    if (processedConfigs.includes(configStr)) continue;
    processedConfigs.push(configStr);

    await applyConfig(t, config);
    await t.context.app.browserWindow.capturePage().then((imageBuffer: ArrayBuffer) => {
      const testName = t['_test'].title.replace('afterEach for ', '');
      const imageFileName = `${testName}__${configInd}.png`;
      const dir = `${CONFIG.dist}/${branchName}`;
      fs.writeFileSync(`${dir}/${imageFileName}`, imageBuffer);
    });
  }

}

interface IScreentestOptions {
  window: 'main' | 'child'
}

export function useScreentest(options: IScreentestOptions = { window: 'main' }) {

  branchName = execSync('git status').toString().replace('On branch ', '').split('\n')[0];

  test.afterEach(async t => {
    await makeScreenshots(t, options);
  });
}

