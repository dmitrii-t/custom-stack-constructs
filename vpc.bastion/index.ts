import { VpcConstruct } from '../vpc';
import * as ec2 from '@aws-cdk/aws-ec2';
import { CfnInstanceProps } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/cdk';
import { CfnInstance } from '@aws-cdk/aws-ec2';

declare module '../vpc' {
  interface VpcConstruct {
    withBastion(id?: string, props?: CfnInstanceProps): VpcConstruct;
  }
}

export function patchVpcConstructWithBastion() {

  /*
   *
   */
  VpcConstruct.prototype.withBastion = function (id: string = 'Bastion', props?: CfnInstanceProps): VpcConstruct {

    const publicSubnet = this.publicSubnets[0]!;
    const bastionGroup = this.bastionSecurityGroup;

    // Network interface
    const networkInterface = new ec2.CfnNetworkInterface(this, `${id}NetworkInterface`, {
      groupSet: [bastionGroup.securityGroupId],
      subnetId: publicSubnet.subnetId,
    });

    // Bastion Instance
    const bastionInstance = new ec2.CfnInstance(this, id, {
      networkInterfaces: [{
        networkInterfaceId: networkInterface.ref,
        deviceIndex: '0',
      } as CfnInstance.NetworkInterfaceProperty],
      //Overrides
      ...props,
    });

    // Outputs
    const publicEndpoint = new cdk.CfnOutput(this, `${id}Instance`, {
      description: `${id} instance public DNS name`,
      value: bastionInstance.instancePublicDnsName
    });

    return this;
  }
}
