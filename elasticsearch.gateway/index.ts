import { ElasticsearchConstruct } from '../elasticsearch';
import { RestApiConstruct } from '../apigateway';

// Adds ElasticsearchConstruct stream methods  declaration
declare module '../elasticsearch' {
  interface ElasticsearchConstruct {
    withApiGateway(path: string, apis: string[], props?: ElasticsearchApiProps): ElasticsearchConstruct;
  }
}

export interface ElasticsearchApiProps {
  cors: {
    origin: string;
    allowHeaders?: string;
  }
}

export function patchElasticsearchConstructWithApiGateway() {

  /**
   * Adds API Gateway for Elasticsearch domain
   *
   * @param path
   * @param apis
   * @param props
   */
  ElasticsearchConstruct.prototype.withApiGateway = function (path: string, apis: string[] = ['_search'], props?: ElasticsearchApiProps): ElasticsearchConstruct {
    const restApiConstruct = new RestApiConstruct(this, 'ElasticsearchApiGateway');
    restApiConstruct.node.addDependency(this.instance);

    const resource = restApiConstruct.resource(path);

    const allowMethods = [];

    // Adds APIs
    apis.forEach((api) => {
      resource.addHttpProxyIntegration('GET', this.endpoint + `/${path}` + `/${api}`);
    });
    allowMethods.push('GET');

    // Applies provided props
    if (props && props.cors) {
      resource.addCors({allowMethods, ...props.cors})
    }

    return this;
  };
}




