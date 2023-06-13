import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Stage, Deployment, MethodOptions} from 'aws-cdk-lib/aws-apigateway';
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
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

    // SNS for Alarm

    const errorTopic = new sns.Topic(this, 'ErrorTopic', {
      displayName: props.sns.name,
    });

    errorTopic.addSubscription(new subscriptions.EmailSubscription(props.sns.email));


    lambdaerror.addAlarmAction(new cloudwatchActions.SnsAction(errorTopic));
 
    // cognito

    const userpool = new cognito.UserPool(this, 'my-user-pool', {
      userPoolName: props.userpool.name,
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: props.userpool.emailSubject,
        emailBody: props.userpool.emailBody, // # This placeholder is a must if code is selected as preferred verification method
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      standardAttributes: {
        familyName: {
          mutable: false,
          required: true,
        },
        address: {
          mutable: true,
          required: false,
        },
      },
      customAttributes: {
        'tenantId': new cognito.StringAttribute({
          mutable: false,
          minLen: 10,
          maxLen: 15,
        }),
        'createdAt': new cognito.DateTimeAttribute(),
        'employeeId': new cognito.NumberAttribute({
          mutable: false,
          min: 1,
          max: 100,
        }),
        'isAdmin': new cognito.BooleanAttribute({
          mutable: false,
        }),
      },
      passwordPolicy: {
        minLength: props.userpool.passwordLength,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userpool.addClient('my-app-client', {
      userPoolClientName: props.userpool.userpoolclientName,
      generateSecret: true,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          //clientCredentials: true,   // server-to-server authentication

          authorizationCodeGrant: true,  // user auth
          implicitCodeGrant: true  //user authentication
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.COGNITO_ADMIN
        ]
      },
      preventUserExistenceErrors: true
    });


    const adminRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': userpool.userPoolId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    
    adminRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-identity:GetCredentialsForIdentity',
          'cognito-identity:GetId',
          'cognito-identity:GetOpenIdToken',
        ],
        resources: ['*'],
      }),
    );


    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': userpool.userPoolId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    const unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': userpool.userPoolId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });


    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: props.userpool.identitypoolname,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: appClient.userPoolClientId,
          providerName: userpool.userPoolProviderName
        }
      ]
    });


    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
      roleMappings: {
        adminsMapping: {
            type: 'Token',
            ambiguousRoleResolution: 'AuthenticatedRole',
            identityProvider: `${userpool.userPoolProviderName}:${appClient.userPoolClientId}`
        }
    }
    });
    




    // MyRestApiGW

    
    const prodLogGroup = new logs.LogGroup(this, 'ProdLogGroup', {
      logGroupName: '/aws/api-gateway/MyRestAPI/prod',
      retention: RetentionDays.INFINITE,
    });

    const myapi = new apigateway.RestApi(this, 'MyRestAPI', {
      restApiName: props.api.name,
      description: props.api.desc,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE']
      },
      cloudWatchRole: true,
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigateway.LogGroupLogDestination(prodLogGroup),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      }
    });


    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userpool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization'
    });

    authorizer._attachToApi(myapi);

    const cognitoAuth: MethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: {
          authorizerId: authorizer.authorizerId
      }
    }

          
    const rootResource = myapi.root.addResource(props.api.rootResource);
    const resource =  rootResource.addResource('mydemoapp');
    resource.addMethod('GET', integration, cognitoAuth);

    resource.addMethod('POST', integration, {
      apiKeyRequired: true,
    });

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

    const apiKey = myapi.addApiKey('myApiKey', {
      apiKeyName: props.apiKey.name,
      description: props.apiKey.desc,
    });
    
    usageplan.addApiKey(apiKey);


    // DEV Stage & Usage Plan

    const devLogGroup = new logs.LogGroup(this, 'devLogGroup', {
      logGroupName: '/aws/api-gateway/MyRestAPI/Dev',
      retention: RetentionDays.THREE_MONTHS,
    });

    const devStage = new Stage(this, 'DevStage', {
      stageName: 'dev',
      deployment: new Deployment(this, 'DevDeployment', {
        api: myapi,
      }),
      accessLogDestination: new apigateway.LogGroupLogDestination(devLogGroup),
      accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
        caller: false,
        httpMethod: true,
        ip: true,
        protocol: true,
        requestTime: true,
        resourcePath: true,
        responseLength: true,
        status: true,
        user: true,
      }),
    });

    const devUsagePlan = myapi.addUsagePlan('DevUsagePlan', {
      name: 'Dev Usage Plan',
      description: 'Usage plan for the dev stage',
      apiStages: [
        {
          stage: devStage,
          api: myapi,
        },
      ],
      quota: {
        limit: props.usageplan.limit,
        period: apigateway.Period.DAY,
      },
      throttle: {
        rateLimit: props.usageplan.rateLimit,
        burstLimit: props.usageplan.burstLimit,
      },
    });


    const DevapiKey = myapi.addApiKey('mydevApiKey', {
      apiKeyName: props.devapiKey.name,
      description: props.devapiKey.desc,
    });

    
    
    devUsagePlan.addApiKey(DevapiKey);



    
    
  }
}