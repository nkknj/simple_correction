import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

export class SimpleCorrectionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. フロントエンド用 S3 バケット (非公開)
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // OAI で CloudFront からのみアクセス許可
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for website bucket'
    });
    websiteBucket.grantRead(oai);

    // 2. CloudFront Distribution (defaultRootObject を設定)
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity: oai
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // 3. S3 デプロイメント
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'frontend', 'build'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // 4. バックエンド Lambda 関数
    const correctionLambda = new lambda.Function(this, 'CorrectionFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      timeout: Duration.seconds(60),
      environment: {
        MODEL_ID: 'us.amazon.nova-lite-v1:0'
      },
    });

    // 5. API Gateway
    const api = new apigateway.LambdaRestApi(this, 'ApiGateway', {
      handler: correctionLambda,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['POST', 'OPTIONS'],
      },
    });
    const process = api.root.addResource('process');
    process.addMethod('POST');

    // 6. 出力
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`
    });
    new cdk.CfnOutput(this, 'ApiURL', {
      value: `${api.url}process`
    });
  }
}
