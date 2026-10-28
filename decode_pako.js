import pako from 'pako';
import { Buffer } from 'buffer';

const b64 = 'eNpVjcFugkAQhl9lM6c2QYMCCntoUrH1YtIePBU8TGRgSWWXLEusBd69C8a0ndNMvu__p4OTygg45Gd1OQnUhh22qWR2npNY6LIxFTZHNps99TsyrFKSrj3bPOwUa4Sq61IWjzd_M0os7vainRjyIUn4ONxRP-TdJPdsme6yNqo9_yeGievaSlO_C1v8nQpNNvSY58hxnJ9QsRj0p4EChywy40S05UJGucDyhG2kKRlBFKXC7ZpRjezYppHKwsRrlh1LVPalVWwiw9efGXm2doaFtiYXGX4VkRjpWrTTAg6kBeAdfwD3fn4e-H628RRitAs9fO3C1znIeuK67XC9Dz40CfzE48D39dOfhOhh-ANPAdA8';

try {
  const binary = Buffer.from(b64, 'base64');
  const decompressed = pako.inflate(binary, { to: 'string' });
  console.log(decompressed);
} catch (e) {
  console.error(e);
}
