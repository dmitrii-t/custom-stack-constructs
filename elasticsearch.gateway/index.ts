import { ElasticsearchConstruct } from '../elasticsearch';
import { RestApiConstruct } from '../apigateway';
import { ConnectionType, HttpIntegrationProps, VpcLink } from '@aws-cdk/aws-apigateway';

// Adds ElasticsearchConstruct stream methods  declaration
declare module '../elasticsearch' {
  interface ElasticsearchConstruct {
    withApiGateway(method: string, resourceName: string, integrationPath:string, props?: ElasticsearchApiProps): ElasticsearchConstruct;
  }
}

export interface ElasticsearchApiProps {
  cors?: {
    origin: string;
    allowHeaders?: string;
  }
  vpcLink?: VpcLink
}

export function patchElasticsearchConstructWithApiGateway() {

  /**
   * Adds API Gateway for Elasticsearch domain
   *
   * @param method
   * @param resourceName
   * @param props
   */
  ElasticsearchConstruct.prototype.withApiGateway = function (method: string, resourceName: string, integrationPath:string, props?: ElasticsearchApiProps): ElasticsearchConstruct {
    const restApiConstruct = new RestApiConstruct(this, this.id + 'ApiGateway');
    restApiConstruct.node.addDependency(this.instance);

    const integrationProps: HttpIntegrationProps = {};

    //
    if (props && props.vpcLink) {
      const vpcIntegrationProps: HttpIntegrationProps = {
        options: {
          connectionType: ConnectionType.VpcLink,
          vpcLink: props.vpcLink
        }
      };

      // Updates
      Object.assign(integrationProps, vpcIntegrationProps);
    }

    const resource = restApiConstruct.resource(resourceName);
    resource.addHttpProxyIntegration(method, this.endpoint + integrationPath, integrationProps);

    // Applies provided props
    if (props && props.cors) {
      resource.addCors({allowMethods: [method], ...props.cors})
    }

    return this;
  };

  // ElasticsearchConstruct.prototype.withApiGateway = function (props?: ElasticsearchApiProps) {
  //   const restApiConstruct = new RestApiConstruct(this, this.id + 'ApiGateway');
  //   restApiConstruct.node.addDependency(this.instance);
  //
  //   const resource = restApiConstruct.root();
  //   resource.addHttpGreedyProxy();
  //
  //   // Applies provided props
  //   if (props && props.cors) {
  //     resource.addCors({allowMethods: ['ANY'], ...props.cors})
  //   }
  //
  //   return this;
  // }
}




