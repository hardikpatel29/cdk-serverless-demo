import { ICdkServerlessProps } from './config-types';

const environmentConfig: ICdkServerlessProps = {
  tags: {
    Developer: 'Hardik Patel',
    Application: 'CdkServerlessDemo',
  },
  lambda: {
    name: 'myresolver',
    desc: 'Lambda resolver used for Api Gateway',
    memory: 256,
    timeout: 30,
  },
  api: {
    name: 'MyRestApi',
    desc: 'Rest Api Gateway used for Api Gateway',
    //modelName: 'DemoModel',
    rootResource: 'v1',
    stageName: 'Staging',
  },
  usageplan: {
    name: 'MyUsagePlan',
    desc: 'Usage plan used for Api Gateway',
    limit: 100,   // single day request
    rateLimit: 20,
    burstLimit: 10,
  },
  apiKey: {
    name: 'MyApiKey',
    desc: 'Api Key used for Api Gateway',
  },
  devapiKey: {
    name: 'DevAPI',
    desc: 'Dev API GW',
  },
  env: {

    //region: 'process.env.CDK_DEFAULT_REGION'
    region: 'us-east-2',
    //account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  cloudwatch: {
    evaluationPeriods: 1,
    threshold: 1
  }
  
};

export default environmentConfig;