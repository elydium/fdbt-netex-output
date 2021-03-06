# Fares Data Build Tool NeTEx Output

[![CircleCI](https://circleci.com/gh/fares-data-build-tool/fdbt-netex-output.svg?style=svg)](https://circleci.com/gh/fares-data-build-tool/fdbt-netex-output)

Code for creating, validating and uploading NeTEx data.

The repo is split into three components:

-   `Netex Convertor`: TypeScript Lambda responsible for generating NeTEx from user uploaded data in S3 and public reference data stored in the database
-   `Netex Validator`: Python Lambda responsible for validating the NeTEx against the published XSD and uploading to another S3 bucket if the validation is succesful
-   `Netex Emailer`: TypeScript Lambda responsible for emailing validated Netex to user

## Deploying

This tool uses the Serverless Framework to manage deployments to AWS and it is split into two serverless.yml files, one for the TypeScript Lambdas and one for the Python Lambda.

To deploy these lambdas directly, you will need to have the following requirements:

-   [Serverless CLI](https://serverless.com/framework/docs/getting-started/)
-   AWS Credentials setup on your machine
-   Infrastructure in `fdbt-aws` repo all deployed

### TypeScript Lambdas

In the root directory, run:

```bash
npm install
sls deploy --stage={STAGE_TO_DEPLOY_TO}
```

### Python Lambda

In the root directory, run the following:

```bash
cd src/netex-validator
npm install
sls deploy --stage={STAGE_TO_DEPLOY_TO}
```
