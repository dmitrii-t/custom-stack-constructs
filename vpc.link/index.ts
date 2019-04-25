import { VpcConstruct, VpcPlacement } from '../vpc';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { VpcLink } from '@aws-cdk/aws-apigateway';
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');


declare module '../vpc' {
  interface VpcConstruct {
    /**
     * Places VpcLink to private subnet
     *
     * @param vpcLinkName
     */
    withPrivateVpcLink(vpcLinkName?: string): VpcConstruct;

    /**
     * Places Vpc Link according to provided placement
     *
     * @param vpcLinkName
     * @param vpcLinkPlacement
     */
    withVpcLink(vpcLinkName: string, vpcLinkPlacement: VpcPlacement): VpcConstruct;

    /**
     * The reference to the private VpcLink
     */
    privateVpcLink: VpcLink
  }
}

export function patchVpcConstructWithVpcEndpoint() {
  //
  VpcConstruct.prototype.withPrivateVpcLink = function (vpcLinkName: string = 'PrivateVpcLink'): VpcConstruct {
    return this.withVpcLink(vpcLinkName, this.privateVpcPlacement);
  };

  VpcConstruct.prototype.withVpcLink = function (vpcLinkName: string, vpcLinkPlacement: VpcPlacement): VpcConstruct {
    //
    const networkBalancer = new elbv2.NetworkLoadBalancer(this, this.id + 'NetworkLoadBalancer', {
      vpc: vpcLinkPlacement.vpc,
      vpcPlacement: vpcLinkPlacement.vpcPlacementStrategy
    });

    this.privateVpcLink = new apigateway.VpcLink(this, this.id + 'VpcLink', {
      targets: [networkBalancer],
      name: vpcLinkName
    });

    //Outputs
    // const vpcLinkId = new cdk.CfnOutput(this, vpcLinkName, {
    //   description: `${vpcLinkName} VCP link id`,
    //   value: this.privateVpcLink.vpcLinkId
    // });

    return this
  }
}
