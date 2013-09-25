
const TEAM_SURVIVORS = 2;
const TEAM_ZOMBIES = 3;
const ZOMBIES_PER_HERO = 10; //cut in half from 20 to 10 so that 10 reg zombie + 10 flying spawn

var timers = require('timers');
var zombies = 0.0;
var nextFrameFuncs = [];
var time = 0.0;
var spawningZombie = false;
var spawningFlyingZombie = false;
var spawningZombieFactor = 1.0;
var playerManager = null;

Array.prototype.remove = function(e){
	var i = this.indexOf(e);
	if(i != -1){
		this.splice(i, 1);
	}
}

game.hook("OnMapStart", function(){
	playerManager = game.findEntityByClassname(-1, "dota_player_manager");
	
	dota.loadParticleFile("particles/units/heroes/hero_undying.pcf");
	
	dota.removeAll("ent_dota_fountain*");
	dota.removeAll("ent_dota_shop*");
	dota.removeAll("npc_dota_tower*");
	dota.removeAll("npc_dota_barracks*");
	dota.removeAll("npc_dota_creep*");
	dota.removeAll("npc_dota_building*");
	dota.removeAll("npc_dota_neutral_spawner*");
	dota.removeAll("npc_dota_roshan_spawner*");
	dota.removeAll("npc_dota_scripted_spawner*");
	dota.removeAll("npc_dota_spawner*");
	dota.removeAll("npc_dota_roshan*");
});

game.hook("OnGameFrame", function(){
	for (var i = 0; i < nextFrameFuncs.length; i++) {
		nextFrameFuncs[i]();
	}
	
	nextFrameFuncs = [];
	
	blockHeroes(); 
	
	if(game.rules.props.m_nGameState != 5) return;
	time = game.rules.props.m_fGameTime - game.rules.props.m_flGameStartTime;
	if(time < 0.0) return;
	
	var zombieFactor = Math.pow(time/300, 2) + 0.01;
	spawnZombies(zombieFactor);
	checkDefeat(); //comment to disable defeat check
});

game.hook("Dota_OnUnitParsed", function(unit, keyvalues){
	if(spawningZombie){
		var f = Math.sqrt(spawningZombieFactor);
		keyvalues["StatusHealth"] = (30 + Math.max(Math.floor(time - 30) / 2, 0)) * ((f - 1) / 30 + 1);
		keyvalues["StatusHealthRegen"] = Math.floor(Math.sqrt(f)) / 2;
		keyvalues["ArmorPhysical"] = Math.floor(f - 1);
		keyvalues["AttackDamageMin"] = 37 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["AttackDamageMax"] = 45 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["BountyGoldMin"] = 30 * Math.sqrt(f);
		keyvalues["BountyGoldMax"] = 30 * Math.sqrt(f);
		keyvalues["ModelScale"] = Math.min(0.95 + 0.1 * f, 2);
		keyvalues["BountyXP"] = 75 * f;
		
		keyvalues["Ability1"] = "";
		keyvalues["Ability2"] = "";
		
	}
    
    if(spawningFlyingZombie){
    var f = Math.sqrt(spawningZombieFactor);
        keyvalues["StatusHealth"] = (15 + Math.max(Math.floor(time - 30) / 2, 0)) * ((f - 1) / 30 + 1);
		keyvalues["StatusHealthRegen"] = Math.floor(Math.sqrt(f)) / 4;
		keyvalues["ArmorPhysical"] = Math.floor(f - 1);
		keyvalues["AttackDamageMin"] = 17 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["AttackDamageMax"] = 25 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["BountyGoldMin"] = 20 * Math.sqrt(f);
		keyvalues["BountyGoldMax"] = 20 * Math.sqrt(f);
		keyvalues["ModelScale"] = Math.min(0.95 + 0.1 * f, 2);
		keyvalues["BountyXP"] = 75 * f;
		
		keyvalues["Ability1"] = "";
		keyvalues["Ability2"] = "";
        
        keyvalues["MovementCapabilities"] = "DOTA_UNIT_CAP_MOVE_FLY";
        keyvalues["MovementSpeed"] = 400;
        keyvalues["VisionDaytimeRange"] = 1800;
        keyvalues["VisionNighttimeRange"] = 1800;
        keyvalues["ProjectileModel"] = "ranged_tower_good";
        keyvalues["AttackRate"] = 2; // Speed of attack.
        keyvalues["AttackAcquisitionRange"] = 800; // Range within a target can be acquired
        keyvalues["AutoAttacksByDefault"] = 1;      
    }
});

game.hook("Dota_OnUnitThink", function(unit){
	if(!unit.isValid()){
		throw new Error("This should never happen");
	}
	
	var clsname = unit.getClassname();
	if(unit.isHero()){
		dota.setUnitState(unit, dota.UNIT_STATE_REVEALED, true);
		dota.setUnitState(unit, dota.UNIT_STATE_INVISIBLE, false);
		if(unit.netprops.m_iCurShop < 0 || unit.netprops.m_iCurShop > 2){
			unit.netprops.m_iCurShop = 0;
		}
	}else if(clsname == "npc_dota_fort"){
		dota.setUnitState(unit, dota.UNIT_STATE_INVULNERABLE, true);
	}else if(clsname == "npc_dota_courier"){
		dota.setUnitState(unit, dota.UNIT_STATE_INVULNERABLE, true);
	}else if(unit.isZombie){
		//dota.setUnitState(unit, dota.UNIT_STATE_MAGIC_IMMUNE, true);
		if(unit.netprops.m_iHealth <= 0){
			unit.hero.zombies.remove(unit);
			dota.remove(unit);
		}
	}
});

game.hook("OnEntityDestroyed", function(ent){
	if(ent.isZombie){
		ent.hero.zombies.remove(ent);
	}
});

game.hook("Dota_OnBuyItem", function(unit, item, playerID, unknown){
	if(item == "item_blink" || item == "item_recipe_force_staff" || item == "item_force_staff"){
		return false;
	}
});

timers.setInterval(function(){
	for (var i = 0; i < server.clients.length; i++) {
		var client = server.clients[i];
		if(client == null || !client.isInGame()) continue;
		var heroes = client.getHeroes();
		
		for (var j = 0; j < heroes.length; j++) {
			var hero = heroes[j];
			hero.zombieFactor += time / 120;
		}
	}
}, 2.5 * 60 * 1000);

function spawnZombies(factor){
	for (var i = 0; i < server.clients.length; i++) {
		var client = server.clients[i];
		if(client == null || !client.isInGame()) continue;
		var heroes = client.getHeroes();
		
		for (var j = 0; j < heroes.length; j++) {
			var hero = heroes[j];
			if(hero.netprops.m_iHealth == 0) {
				hero.zombieFactor = 0.0;
				continue;
			}
			
			if(!hero.zombieFactor) hero.zombieFactor = 0.0;
			if(!hero.zombies) hero.zombies = [];
			
			if(hero.zombies.length < ZOMBIES_PER_HERO){
				hero.zombieFactor += factor;
				if(hero.zombieFactor < 1.0) continue;
				
				var thisFactor = hero.zombieFactor / (ZOMBIES_PER_HERO - hero.zombies.length);
				if(thisFactor < 1.0) {
					thisFactor = 1.0;
				}
				
				hero.zombieFactor -= thisFactor;
				hero.zombies.push(spawnZombie(hero, thisFactor));
                hero.zombies.push(spawnFlyingZombie(hero, thisFactor)); //add flying zombie
			}else if(time > 30) {
				hero.zombieFactor += factor * Math.pow(time / 180, 2);
			}
		}
	}
}

function spawnZombie(hero, factor){
	spawningZombie = true;
	spawningZombieFactor = factor;
	var zombie = dota.createUnit("npc_dota_unit_undying_zombie", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
	
	// The zombie will appear 1800 units away from the hero
	var vec = hero.netprops.m_vecOrigin;
	var ang = Math.random() * 2 * Math.PI;
	var d = 1800;
	
	var x = vec.x + Math.cos(ang) * d;
	var y = vec.y + Math.sin(ang) * d;
	zombie.isZombie = true;
	zombie.hero = hero;
	
	dota.findClearSpaceForUnit(zombie, x, y, vec.z);
	
	// This needs to run on the next frame
	nextFrameFuncs.push(function(){
		// We make the zombie controllable by the player 0, then remove that, just so we can give the zombies an order
		dota.setUnitControllableByPlayer(zombie, 0, true);
		dota.executeOrders(0, dota.ORDER_TYPE_ATTACK, [zombie], hero, null, false, vec);
		dota.setUnitControllableByPlayer(zombie, 0, false);
	});
	
	timers.setTimeout(function(){
		hero.zombies.remove(zombie);
		if(zombie.isValid()){
			dota.remove(zombie);
		}
	}, 30000);
	
	spawningZombie = false;
	return zombie;
}

function spawnFlyingZombie(hero, factor){
	spawningFlyingZombie = true;
	spawningZombieFactor = factor;
	var zombie = dota.createUnit("npc_dota_visage_familiar1", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
	
	// The zombie will appear 1800 units away from the hero
	var vec = hero.netprops.m_vecOrigin;
	var ang = Math.random() * 2 * Math.PI;
	var d = 1800;
	
	var x = vec.x + Math.cos(ang) * d;
	var y = vec.y + Math.sin(ang) * d;
	zombie.isZombie = true;
	zombie.hero = hero;
	
	dota.findClearSpaceForUnit(zombie, x, y, vec.z);
	
	// This needs to run on the next frame
	nextFrameFuncs.push(function(){
		// We make the zombie controllable by the player 0, then remove that, just so we can give the zombies an order
		dota.setUnitControllableByPlayer(zombie, 0, true);
		dota.executeOrders(0, dota.ORDER_TYPE_ATTACK, [zombie], hero, null, false, vec);
		dota.setUnitControllableByPlayer(zombie, 0, false);
	});
	
	timers.setTimeout(function(){
		hero.zombies.remove(zombie);
		if(zombie.isValid()){
			dota.remove(zombie);
		}
	}, 30000);
	
	spawningFlyingZombie = false;
	return zombie;
}

var hasLost = false;
function checkDefeat(){
	if(hasLost) return;
	if(time < 30) return;
	
	var radiantAlive = false;
	var direAlive = false;
	
	for (var i = 0; i < server.clients.length; i++) {
		var client = server.clients[i];
		if(client == null || !client.isInGame()) continue;
		var heroes = client.getHeroes();
		
		for (var j = 0; j < heroes.length; j++) {
			var hero = heroes[j];
			if(hero.netprops.m_iHealth != 0){
				if(hero.netprops.m_iTeamNum == 2){
					radiantAlive = true;
				}else{
					direAlive = true;
				}
			}
		}
	}
	
	if(radiantAlive && !direAlive){
		dota.forceWin(2);
		hasLost = true;
	}else if(direAlive && !radiantAlive){
		dota.forceWin(3);
		hasLost = true;
	}
}

function blockHeroes(){
	dota.setHeroAvailable(dota.HERO_UNDYING, false);
	
	// Temporary, once we have flying zombies, we can remove those.
	// dota.setHeroAvailable(dota.HERO_FURION, false);
	// dota.setHeroAvailable(dota.HERO_QUEEN_OF_PAIN, false);
	// dota.setHeroAvailable(dota.HERO_MORPHLING, false);
	// dota.setHeroAvailable(dota.HERO_SAND_KING, false);
	// dota.setHeroAvailable(dota.HERO_BATRIDER, false);
	// dota.setHeroAvailable(dota.HERO_ANTIMAGE, false);
	// dota.setHeroAvailable(dota.HERO_SPECTRE, false);
	// dota.setHeroAvailable(dota.HERO_FACELESS_VOID, false);
	// dota.setHeroAvailable(dota.HERO_MIRANA, false);
	// dota.setHeroAvailable(dota.HERO_PUCK, false);
    // dota.setHeroAvailable(dota.HERO_IO, false); //should also disable wisp
     
}

// For testing
dota.removeAll("npc_dota_unit_undying_zombie");

// Tet hasn't updated the smjs version on a few servers yet, and we need this function
// Do not do this in your plugins
if(!dota.setUnitControllableByPlayer){
	dota.setUnitControllableByPlayer = function(ent, playerId, value){
		if(value){
			ent.netprops.m_iIsControllableByPlayer |= 1 << playerId;
		}else{
			ent.netprops.m_iIsControllableByPlayer &= ~(1 << playerId);
		}
	}
}