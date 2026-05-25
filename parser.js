const fs = require('fs');
const { default: plist } = require('@expo/plist');

function parseLevel(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = plist.parse(raw);

    const level = {
        world: parseVec(data.ScenePreference.GameWorld),
        gravity: parseVec(data.Gravity),
        background: data.ScenePreference.BackgroundColor,
        objects: [],
        joints: [],
    };

    // Parse joints
    for (const joint of data.JOINTS_INFO) {
        level.joints.push({
            name: joint.UniqueName,
            objectA: joint.ObjectA,
            objectB: joint.ObjectB,
            type: joint.Type,
        });
    }

    // Parse nodes recursively
    for (const node of data.NODES_INFO) {
        parseNode(node, level.objects);
    }

    return level;
}

function parseNode(node, output) {
    if (node.NodeType === 'LHSprite' && node.TextureProperties) {
        const tex = node.TextureProperties;
output.push({
    name: node.UniqueName,
    type: node.NodeType,
    tag: tex.TagName,
    position: parseVec(tex.Position),
    size: parseVec(tex.SpriteSize),
    frame: parseVec(tex.Frame),  // add this line
    angle: tex.Angle,
    opacity: tex.Opacity,
    flipX: tex.FlipX,
    flipY: tex.FlipY,
    zOrder: tex.ZOrder,
    sheet: node.SheetImage,
    sprite: node.SHSpriteName,
    animation: node.AnimationsProperties?.AnimName || null,
});
    }

    if (node.Children && node.Children.length > 0) {
        for (const child of node.Children) {
            parseNode(child, output);
        }
    }
}

function parseVec(str) {
    if (!str) return null;
    const nums = str.match(/-?\d+(\.\d+)?/g);
    if (!nums) return null;
    if (nums.length === 2) return { x: parseFloat(nums[0]), y: parseFloat(nums[1]) };
    if (nums.length === 4) return { x: parseFloat(nums[0]), y: parseFloat(nums[1]), w: parseFloat(nums[2]), h: parseFloat(nums[3]) };
    return null;
}

const levelsDir = './levels';
const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.plhs'));

for (const file of files) {
    const level = parseLevel(`${levelsDir}/${file}`);
    const outName = file.replace('.plhs', '.json');
    fs.writeFileSync(`${levelsDir}/${outName}`, JSON.stringify(level, null, 2));
    console.log(`Parsed ${file} → ${outName}`);
}