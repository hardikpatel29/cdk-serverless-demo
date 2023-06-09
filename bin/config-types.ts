import { StackProps } from 'aws-cdk-lib';

export interface ICdkServerlessProps extends StackProps {
  lambda: {
    name: string,
    desc: string,
    memory: number,
    timeout: number,
  },
  api: {
    name: string,
    desc: string,
    //modelName: string,
    rootResource: string,
    stageName: string,
  },
  usageplan: {
    name: string,
    desc: string,
    limit: number,
    rateLimit: number,
    burstLimit: number
  },
  apiKey: {
    name: string,
    desc: string,
  },
  devapiKey: {
    name: string,
    desc: string,
  },
  env: {
    region: string,
    //account: number,
  },
  cloudwatch: {
    evaluationPeriods: number,
    threshold: number
  }
}