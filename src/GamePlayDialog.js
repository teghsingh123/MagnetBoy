// Matches GamePlayDialog.lua: fail and win overlay dialogs

export function showFail(scene) {
    if (scene.failShown) return;
    scene.failShown      = true;
    scene.isLevelComplete = true;
    if (scene.hero?.body) {
        scene.hero.body.setVelocity(0, 0);
        scene.hero.body.setAllowGravity(false);
    }

    scene.add.rectangle(375, 160, 750, 320, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
    scene.add.image(375, 160, 'dialog_bg').setDisplaySize(300, 180).setScrollFactor(0).setDepth(101);
    scene.add.text(310, 80, 'Try Again',
        { fontSize: '18px', color: '#ff4444', fontFamily: 'DomkratMon' })
        .setScrollFactor(0).setDepth(102);

    scene.add.image(375, 200, 'buttons_sheet', 'refresh')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => scene.scene.restart());

    scene.add.image(415, 200, 'buttons_sheet', 'list')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => scene.scene.start('WorldScene', { world: scene.currentWorld }));
}

export function showWin(scene) {
    if (scene.wonAlready) return;
    scene.wonAlready = true;

    scene.add.rectangle(375, 160, 750, 320, 0x000000, 0.6).setScrollFactor(0).setDepth(100);
    scene.add.image(375, 160, 'dialog_bg').setDisplaySize(300, 180).setScrollFactor(0).setDepth(101);
    scene.add.text(251, 80, `${scene.currentWorld}-${scene.currentLevel} үе`,
        { fontSize: '14px', color: '#fff', fontFamily: 'DomkratMon' })
        .setScrollFactor(0).setDepth(102);

    const sf = `bigstar${Math.min(scene.starCount, 3)}`;
    scene.add.image(475, 88, 'buttons_sheet', sf)
        .setDisplaySize(54, 20).setScrollFactor(0).setDepth(102);

    scene.add.image(455, 220, 'buttons_sheet', 'refresh')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => scene.scene.restart());

    scene.add.image(495, 220, 'buttons_sheet', 'next')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => {
            let nl = scene.currentLevel + 1, nw = scene.currentWorld;
            if (nl > 20) { nl = 1; nw++; }
            scene.scene.start('GameScene', { world: nw, level: nl });
        });

    scene.add.image(415, 220, 'buttons_sheet', 'list')
        .setDisplaySize(40, 40).setScrollFactor(0).setDepth(102).setInteractive()
        .on('pointerdown', () => scene.scene.start('WorldScene', { world: scene.currentWorld }));
}
