import * as cdk from 'aws-cdk-lib';
import { SimpleCorrectionStack } from '../lib/simple_correction-stack';

const app = new cdk.App();
new SimpleCorrectionStack(app, 'SimpleCorrectionStack');
