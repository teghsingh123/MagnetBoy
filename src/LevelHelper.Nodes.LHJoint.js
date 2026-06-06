// LHJoint — describes a physics joint between two sprites.

import { lh_pointFromString } from './LevelHelper.Helpers.LHHelpers.js';

export const LH_JOINT_TYPE = {
    DISTANCE: 0,
    REVOLUTE: 1,
    PRISMATIC: 2,
    WELD: 3,
    PULLEY: 4,
    WHEEL: 5,
    ROPE: 6,
    FRICTION: 7,
    GEAR: 8,
};

export class LHJoint {
    constructor(dict) {
        this.lhUniqueName    = '';
        this.lhJointType     = LH_JOINT_TYPE.DISTANCE;
        this.lhSpriteAName   = '';
        this.lhSpriteBName   = '';
        this.lhAnchorA       = { x: 0, y: 0 };
        this.lhAnchorB       = { x: 0, y: 0 };
        this.lhCollideConnected = false;
        this.lhFrequency     = 0;
        this.lhDamping       = 0;
        this.lhEnableLimit   = false;
        this.lhEnableMotor   = false;
        this.lhLowerAngle    = 0;
        this.lhUpperAngle    = 0;
        this.lhMotorSpeed    = 0;
        this.lhMaxMotorTorque = 0;
        // Resolved at load time by LevelHelperLoader:
        this.spriteA = null;
        this.spriteB = null;
        this.phaserJoint = null;

        if (!dict) return;
        this.lhUniqueName       = dict.stringForKey('UniqueName');
        this.lhJointType        = dict.intForKey('jointType');
        this.lhSpriteAName      = dict.stringForKey('spriteAName');
        this.lhSpriteBName      = dict.stringForKey('spriteBName');
        this.lhAnchorA          = dict.pointForKey('anchorA');
        this.lhAnchorB          = dict.pointForKey('anchorB');
        this.lhCollideConnected = dict.boolForKey('collideConnected');
        this.lhFrequency        = dict.floatForKey('frequency');
        this.lhDamping          = dict.floatForKey('damping');
        this.lhEnableLimit      = dict.boolForKey('enableLimit');
        this.lhEnableMotor      = dict.boolForKey('enableMotor');
        this.lhLowerAngle       = dict.floatForKey('lowerAngle');
        this.lhUpperAngle       = dict.floatForKey('upperAngle');
        this.lhMotorSpeed       = dict.floatForKey('motorSpeed');
        this.lhMaxMotorTorque   = dict.floatForKey('maxMotorTorque');
    }

    uniqueName() { return this.lhUniqueName; }
}
