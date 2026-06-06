export const LH_OBJECT_TYPE = {
    INT_TYPE:        0,
    FLOAT_TYPE:      1,
    BOOL_TYPE:       2,
    STRING_TYPE:     3,
    LH_DICT_TYPE:    4,
    LH_ARRAY_TYPE:   5,
    LH_VOID_TYPE:    6,
};

export class LHObject {
    constructor(value, type) {
        this.m_object = value;
        this.m_type   = type;
    }

    static init(value, type) { return new LHObject(value, type); }

    initWithObject(other) { return new LHObject(other.m_object, other.m_type); }

    dictValue()   { return this.m_object; }
    arrayValue()  { return this.m_object; }
    stringValue() { return this.m_object; }
    floatValue()  { return Number(this.m_object); }
    intValue()    { return Number(this.m_object); }
    boolValue()   { return this.m_object; }
    voidValue()   { return this.m_object; }

    removeSelf() {
        this.m_object = null;
        this.m_type   = null;
    }
}
