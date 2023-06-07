import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { ICdkServerlessProps } from '../bin/config-types';
import { getSuffixFromStack } from "./Utils";

export class CdkServerlessDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICdkServerlessProps) {
    super(scope, id, props);



    const suffix = getSuffixFromStack(this);


    // myDBTable

    const myTable = new dynamodb.Table(this, 'SpacesTable', {
      partitionKey : {
          name: 'id',
          type: dynamodb.AttributeType.STRING
      },
      tableName: `myTable-${suffix}`
    })

    //S3 bucket
    const mydemos3 = new s3.Bucket(this,"mydemos3bucketid",{
      bucketName:`mydemos-${suffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    
    // policy

    const s3ListBuckets = new iam.PolicyStatement({
      actions: ['s3:ListAllMyBuckets'],
      resources: ['arn:aws:s3:::*'],
    },
    );

    const s3AcessBucket = new iam.PolicyStatement({
      actions: ['s3:*'],
      resources: [`${mydemos3.bucketArn}/*`],
    },
    );
    


    const dynamodbaccess = new iam.PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [myTable.tableArn],
    })
    
    // role

    const mydemorole = new iam.Role(this, 'myroleid', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'This is a mycustom role...',
      roleName:'MyLambdaRole'
    })

    mydemorole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    mydemorole.addToPolicy(s3ListBuckets);
    mydemorole.addToPolicy(s3AcessBucket);
    mydemorole.addToPolicy(dynamodbaccess);


    
    // MyLambdaFunction

    const resolver = new lambda.Function(this, 'LambdaResolver', {
      functionName: props.lambda.name,
      description: props.lambda.desc,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
      exports.handler = async (event, context) => {
        console.log('Hello from Lambda!');
        return {
          statusCode: 200,
          body: 'Hello from Lambda!'
        };
      };
      `),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: props.lambda.memory,
      timeout: cdk.Duration.seconds(props.lambda.timeout),
      role: mydemorole,
    });

    const integration = new apigateway.LambdaIntegration(resolver);


    // Cloudwatch Alarm

    const lambdaerror = new cloudwatch.Alarm(this,'cloudwatchid',{
      evaluationPeriods: props.cloudwatch.evaluationPeriods,
      threshold : props.cloudwatch.threshold,

      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,

      metric: resolver.metricErrors({
        period: cdk.Duration.minutes(1),
      }),
      
     })



    // MyRestApiGW

    const myapi = new apigateway.RestApi(this, 'MyRestAPI', {
      restApiName: props.api.name,
      description: props.api.desc,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE']
      },
    });

    // Add Resource and Methods ApiGW

    const rootResource = myapi.root.addResource(props.api.rootResource);

    const resource =  rootResource.addResource('mydemoapp');

    resource.addMethod('GET', integration);


    // UsagePlan ApiGW


    const usageplan = myapi.addUsagePlan('UsagePlan', {
      name: props.usageplan.name,
      description: props.usageplan.desc,
      apiStages: [{
        api: myapi,
        stage: myapi.deploymentStage,
      }],
      quota: {
        limit: props.usageplan.limit,
        period: apigateway.Period.DAY,
      },
      throttle: {
        rateLimit: props.usageplan.rateLimit,
        burstLimit: props.usageplan.burstLimit,
      },
    });



    // Api Key

    const apiKey = myapi.addApiKey('myApiKey', {
      apiKeyName: props.apiKey.name,
      description: props.apiKey.desc,
    });
    
    usageplan.addApiKey(apiKey);



    
    
  }
}