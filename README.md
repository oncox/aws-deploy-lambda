# AWS Deploy Lambda

aws-deploy-lambda is a helper script for creating and updating simple Node.js AWS lambda functions.  Add it to your node package to ease deploying it to AWS.

This was originally developed to ease Alexa skill development.

## Example

Create a Node.js project and install aws-deploy-lambda

```
mkdir myproject
npm init -y
npm install aws-deploy-lambda --save
```

aws-deploy-lambda is installed and a new .bin script generated.  This can be called directly, or added as an npm script.

Edit package.json scripts...

  ```
  "scripts": {
    "deploy": "./node_modules/.bin/deploy-lambda"
  },
  ```

Then creating or updating your Lambda function is as simple as `npm run deploy`!  The package name will be used as the name of the Lambda function.

## Behind the curtain

aws-deploy-lamda zips up your entire package including node_modules and uploads the contents to a nominated S3 bucket using the [AWS-SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html).  The AWS-SDK is then used to determine whether the user already has a Lambda of *package.name* or whether the Lambda should be created.

Deploying code from an S3 bucket is used since it doesn't look like the AWS-SDK supports uploading a zipfile from a stream which was causing timeouts, but that would be the aspiration and avoid configuring an S3 bucket.


## Setup


##### Generic AWS Credentials

Some environment setup is required for AWS user details, this only needs configuring once and will be picked up by each package using aws-lambda-deploy.

User configuration for AWS permissions is taken from the [AWS credentials file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html#getting-started-nodejs-credentials).  I accidentally set mine up when installing and configuring the AWS-CLI which is a very easy way of managing these credentials, but could be a little heavyweight if you don't need the CLI for anything else.

##### Specific AWS Credentials

aws-deploy-lambda requires two environment variables:

1. AWS_LAMBDA_ARN - The [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) of the role that owns and deploys the lambda.  This role should have permission to manage Lambda functions, and to list them.

2. AWS_BUCKET_NAME - The name of the bucket where code should be uploaded.



