import { CustomConstruct } from '../';
import * as apigateway from '@aws-cdk/aws-apigateway';
import {
  HttpIntegration,
  HttpIntegrationProps,
  IRestApiResource,
  LambdaIntegrationOptions,
  MethodOptions,
  PassthroughBehavior,
  ResourceOptions
} from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/cdk';
import { AuthorizationType } from '@aws-cdk/aws-apigateway';


const CORS_DEFAULT_ALLOW_HEADERS = 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token';

export interface CorsProps {
  origin: string;
  allowMethods: string[];
  allowHeaders?: string;
}

export class RestApiConstruct extends CustomConstruct<apigateway.RestApi> {

  private resourceBuilders: { [key: string]: ResourceBuilder } = {};

  constructor(scope: cdk.Construct, id: string = 'ApiGateway') {
    super(scope, id);
    this.instance = new apigateway.RestApi(this, id);
  }

  resource(path: string, resourceBuilderProvider: (path: string) => ResourceBuilder = this.defaultResourceProvider): ResourceBuilder {
    //
    let resource;
    if (path === '/') {
      return this.root();
    }

    const segments = path.split('/');
    resource = segments[0] || segments[1];

    if (!(resource in this.resourceBuilders)) {
      this.resourceBuilders[resource] = resourceBuilderProvider(resource)
    }

    return this.resourceBuilders[resource]
  }

  root(): ResourceBuilder {
    return this.resourceBuilders['/'] = new ResourceBuilder(this, this.instance.root);
  }

  private defaultResourceProvider = (path: string): ResourceBuilder => {
    const resource = this.instance.root.addResource(path);
    return new ResourceBuilder(this, resource)
  }

}

export class ResourceBuilder {

  constructor(private restApiConstruct: RestApiConstruct, private resource: IRestApiResource) {
  }

  addCors(props: CorsProps): RestApiConstruct {
    const {
      origin, allowMethods, allowHeaders
    } = props;

    //
    const localAllowMethods: string[] = ['OPTIONS'].concat(allowMethods);

    const integration = new apigateway.MockIntegration({
      passthroughBehavior: PassthroughBehavior.Never,
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      },
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': `\'${allowHeaders || CORS_DEFAULT_ALLOW_HEADERS}\'`,
          'method.response.header.Access-Control-Allow-Methods': `\'${localAllowMethods.join(',')}\'`,
          'method.response.header.Access-Control-Allow-Origin': `\'${origin}\'`,
        },
        responseTemplates: {
          'application/json': ''
        }
      }],
    });

    const method: MethodOptions = {
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': new apigateway.EmptyModel()
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': false,
          'method.response.header.Access-Control-Allow-Methods': false,
          'method.response.header.Access-Control-Allow-Origin': false,
        }
      }]
    };

    //
    this.resource.addMethod('OPTIONS', integration, method);
    return this.restApiConstruct;
  }

  addLambdaProxyIntegration(httpMethod: string, handler: lambda.Function, options?: LambdaIntegrationOptions): RestApiConstruct {
    const integrationProps: LambdaIntegrationOptions = {
      // True is the default value, just to be explicit
      proxy: true,
      // Overrides
      ...options,
    };
    this.resource.addMethod(httpMethod, new apigateway.LambdaIntegration(handler, integrationProps));
    return this.restApiConstruct;
  }

  addHttpProxyIntegration(httpMethod: string, url: string, integrationProps?: HttpIntegrationProps, methodProps?: MethodOptions): RestApiConstruct {
    //
    const method: MethodOptions = {
      authorizationType: AuthorizationType.None,
      // requestParameters: {
      //   'method.request.path.proxy': true
      // },
      // methodResponses: [{
      //   statusCode: '200'
      // }],
      // Overrides
      ...methodProps
    };

    const integration: HttpIntegration = new HttpIntegration(url, {
      options: {
        passthroughBehavior: PassthroughBehavior.WhenNoMatch,
        // requestParameters: {
        //   'integration.request.path.proxy': 'method.request.path.proxy',
        // },
        // integrationResponses: [{
        //   statusCode: '200'
        // }]
      },
      httpMethod: httpMethod,
      proxy: true,
      // Overrides
      ...integrationProps
    });
    this.resource.addMethod(httpMethod, integration, method);
    return this.restApiConstruct;
  }
}

