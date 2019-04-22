import { CustomConstruct } from '../index';
import * as ec2 from '@aws-cdk/aws-ec2';
import { IVpcSubnet, SubnetType } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/cdk';

export const publicPlacementStrategy: ec2.VpcPlacementStrategy = {subnetsToUse: SubnetType.Public};
export const privatePlacementStrategy: ec2.VpcPlacementStrategy = {subnetsToUse: SubnetType.Private};
export const isolatedPlacementStrategy: ec2.VpcPlacementStrategy = {subnetsToUse: SubnetType.Isolated};

export interface VpcPlacement {
  readonly vpc: ec2.VpcNetwork;
  readonly vpcPlacementStrategy: ec2.VpcPlacementStrategy;
  readonly securityGroup: ec2.SecurityGroup;
}

export class VpcConstruct extends CustomConstruct<ec2.VpcNetwork> {

  get publicVpcPlacement(): VpcPlacement {
    return {
      securityGroup: this.publicSecurityGroup,
      vpcPlacementStrategy: publicPlacementStrategy,
      vpc: this.instance
    }
  }

  get privateVpcPlacement(): VpcPlacement {
    return {
      securityGroup: this.privateSecurityGroup,
      vpcPlacementStrategy: privatePlacementStrategy,
      vpc: this.instance
    }
  }

  get isolatedVpcPlacement(): VpcPlacement {
    return {
      securityGroup: this.isolatedSecurityGroup,
      vpcPlacementStrategy: isolatedPlacementStrategy,
      vpc: this.instance
    }
  }

  get publicSubnets(): IVpcSubnet[] {
    return this.instance.subnets(publicPlacementStrategy);
  }

  get privateSubnets(): IVpcSubnet[] {
    return this.instance.subnets(privatePlacementStrategy);
  }

  get isolatedSubnets(): IVpcSubnet[] {
    return this.instance.subnets(isolatedPlacementStrategy);
  }

  get vpc(): ec2.VpcNetwork {
    return this.instance;
  }

  publicSecurityGroup: ec2.SecurityGroup;

  bastionSecurityGroup: ec2.SecurityGroup;

  privateSecurityGroup: ec2.SecurityGroup;

  isolatedSecurityGroup: ec2.SecurityGroup;

  constructor(scope: cdk.Construct, id: string,) {
    super(scope, id);

    // Network configuration
    this.instance = new ec2.VpcNetwork(this, id, {
      cidr: '10.0.0.0/16',
      natGateways: 1,
      natGatewayPlacement: {
        subnetName: 'PublicSubnet'
      },
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.Public,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: SubnetType.Private,
        },
        {
          cidrMask: 24,
          name: 'IsolatedSubnet',
          subnetType: SubnetType.Isolated,
        }
      ],
    });

    // Public SG allows http access from the Internet
    this.publicSecurityGroup = new ec2.SecurityGroup(this, 'PublicSG', {
      description: 'Public security group with http access',
      vpc: this.instance
    });
    this.publicSecurityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(80));

    // Bastion SG
    this.bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSG', {
      description: 'Bastio security group with ssh access only which has acess to both private and isolated SGs',
      vpc: this.instance
    });
    this.bastionSecurityGroup.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(22));

    // Private SG
    this.privateSecurityGroup = new ec2.SecurityGroup(this, 'PrivateSG', {
      description: 'Private security group to allow Lambda or API Gateway to access isolated resources',
      vpc: this.instance
    });
    this.privateSecurityGroup.addIngressRule(this.publicSecurityGroup, new ec2.TcpPort(80));
    this.privateSecurityGroup.addIngressRule(this.bastionSecurityGroup, new ec2.TcpPort(80));

    // Isolated SG
    this.isolatedSecurityGroup = new ec2.SecurityGroup(this, 'IsolatedSG', {
      description: 'Isolated security group with limited access from private group only',
      allowAllOutbound: false,
      vpc: this.instance
    });
    this.isolatedSecurityGroup.addIngressRule(this.privateSecurityGroup, new ec2.TcpPort(80));
    this.isolatedSecurityGroup.addIngressRule(this.bastionSecurityGroup, new ec2.TcpPort(80));
  }

}
