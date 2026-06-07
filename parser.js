const fs = require('fs');
const { default: plist } = require('@expo/plist');

const OBB_LEVELS = 'C:/Users/teghs/Downloads/MagnetBoy/Android/obb/mn.moco.game.magnetboy.mgl/main.16.mn.moco.game.magnetboy.mgl/Levels';
const OUT_DIR = './levels';

function parseLevel(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = plist.parse(raw);

    const level = {
        world: parseVec(data.ScenePreference?.GameWorld),
        gravity: parseVec(data.Gravity),
        background: data.ScenePreference?.BackgroundColor,
        objects: [],
        joints: [],
    };

    // Parse joints
    for (const joint of (data.JOINTS_INFO || [])) {
        level.joints.push({
            name: joint.UniqueName,
            objectA: joint.ObjectA,
            objectB: joint.ObjectB,
            type: joint.Type,
        });
    }

    // First pass: collect all LHBezier path definitions (name → curve points)
    const paths = {};
    for (const node of (data.NODES_INFO || [])) {
        collectPaths(node, paths);
    }

    // Second pass: parse sprites, attaching path data where present
    for (const node of (data.NODES_INFO || [])) {
        parseNode(node, level.objects, paths);
    }

    return level;
}

function collectPaths(node, paths) {
    if (node.NodeType === 'LHBezier' && node.TextureProperties) {
        const tex = node.TextureProperties;
        const curves = (tex.Curves || []).map(c => ({
            startPoint:        parseVec(c.StartPoint),
            startControlPoint: parseVec(c.StartControlPoint),
            endControlPoint:   parseVec(c.EndControlPoint),
            endPoint:          parseVec(c.EndPoint),
        }));
        paths[node.UniqueName] = {
            isClosed:     tex.IsClosed   ?? false,
            isSimpleLine: tex.IsSimpleLine ?? false,
            curves,
        };
    }
    for (const child of (node.Children || [])) {
        collectPaths(child, paths);
    }
}

function parseNode(node, output, paths) {
    if (node.NodeType === 'LHSprite' && node.TextureProperties) {
        const tex = node.TextureProperties;
        const obj = {
            name:      node.UniqueName,
            type:      node.NodeType,
            tag:       tex.TagName,
            position:  parseVec(tex.Position),
            size:      parseVec(tex.SpriteSize),
            frame:     parseVec(tex.Frame),
            angle:     tex.Angle,
            opacity:   tex.Opacity,
            flipX:     tex.FlipX,
            flipY:     tex.FlipY,
            zOrder:    tex.ZOrder,
            sheet:     node.SheetImage,
            sprite:    node.SHSpriteName,
            animation: node.AnimationsProperties?.AnimName || null,
        };

        const pp = node.PathProperties;
        if (pp && pp.PathName) {
            const pathDef = paths[pp.PathName];
            obj.path = {
                name:       pp.PathName,
                speed:      pp.PathSpeed ?? 1,
                isCyclic:   pp.PathIsCyclic ?? false,
                otherEnd:   pp.PathOtherEnd ?? false,   // ping-pong
                moveDelta:  pp.PathMoveDelta ?? false,
                startPoint: pp.PathStartPoint ?? 0,
                startAtLaunch: pp.PathStartAtLaunch ?? true,
                curves:     pathDef ? pathDef.curves : [],
                isClosed:   pathDef ? pathDef.isClosed : false,
            };
        }

        output.push(obj);
    }

    for (const child of (node.Children || [])) {
        parseNode(child, output, paths);
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

const files = fs.readdirSync(OBB_LEVELS).filter(f => f.endsWith('.plhs'));

for (const file of files) {
    const level = parseLevel(`${OBB_LEVELS}/${file}`);
    const outName = file.replace('.plhs', '.json');
    fs.writeFileSync(`${OUT_DIR}/${outName}`, JSON.stringify(level, null, 2));
    console.log(`Parsed ${file} → ${outName}`);
}

console.log(`\nDone. ${files.length} levels written to ${OUT_DIR}/`);
