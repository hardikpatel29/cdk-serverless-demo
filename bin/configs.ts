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
    region: 'eu-west-1',
    //account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  cloudwatch: {
    evaluationPeriods: 1,
    threshold: 1
  },
  userpool: {
    name: 'mydemouserpool',
    emailSubject: 'Test Subject',
    emailBody: 'test email Body{####}',
    userpoolclientName: 'myclientpool',
    passwordLength: 10,
    identitypoolname: 'myidentitypool'

  },
  sns: {
    name : 'myTopic',
    email: 'net.patel.hardik@mhp.com'
  }
  
};

export default environmentConfig;