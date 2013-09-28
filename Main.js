
const TEAM_SURVIVORS = 2;
const TEAM_ZOMBIES = 3;
const ZOMBIES_PER_HERO = 20; //20 zombies per hero

const REGULAR_ZOMBIE_TYPE = 1;
const FLYING_ZOMBIE_TYPE = 2;
const SKELETON_ZOMBIE_TYPE = 3;
const NUM_ZOMBIE_TYPES = 3;

const DEFAULT_DIFFICULTY_MULTIPLIER = 1.0;

//const DEBUG_MODE = 0; //0: debug inactive, 1: debug active

var timers = require('timers');
var zombies = 0.0;
var nextFrameFuncs = [];
var time = 0.0;
var spawningZombie = false;
var spawningFlyingZombie = false;
var spawningSkeletonZombie = false;
var spawningZombieFactor = 1.0;
var playerManager = null;

var difficultyMultiplier = DEFAULT_DIFFICULTY_MULTIPLIER;

Array.prototype.remove = function(e){
	var i = this.indexOf(e);
	if(i != -1){
		this.splice(i, 1);
	}
}

//remove unnecessary units at the start of the map
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
    //time = game.rules.props.m_fGameTime - game.rules.props.m_flGameStartTime + 120;
    //debug: use 2nd time with 120s added
    
	if(time < 0.0) return; //debug: comment out to start zombies before 0.0
    
	
	var zombieFactor = Math.pow(time/300, 2) + 0.01;
	spawnZombies(zombieFactor);
	//checkDefeat(); //debug:: comment to disable defeat check
});

game.hook("Dota_OnUnitParsed", function(unit, keyvalues){
var f = Math.sqrt(spawningZombieFactor);

    if(spawningFlyingZombie){
    //flying zombie specific stuff here
        keyvalues["StatusHealth"] = difficultyMultiplier * (15 + Math.max(Math.floor(time - 30) / 2, 0)) * ((f - 1) / 30 + 1);
		keyvalues["StatusHealthRegen"] = Math.floor(Math.sqrt(f)) / 4;
		keyvalues["ArmorPhysical"] = Math.floor(f - 1);
		keyvalues["AttackDamageMin"] = difficultyMultiplier * 11 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["AttackDamageMax"] = difficultyMultiplier * 15 * f * Math.min(1, time / 360 + 0.5);
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
        keyvalues["ConsideredHero"] = 0;  
        keyvalues["MagicalResistance"] = 0; //remove imba magic resistance from visage familiars  
        keyvalues["IsAncient"] = 0; //remove ancient status from new flying zombies based off of drake, otherwise spells wont hit
        keyvalues["UnitRelationshipClass"] = "DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT"; //aha! pretty sure this is why visage birds werent getting autoattacked	
        
        //values to maybe set if not using visage bird as the base unit:
        //keyvalues["Model"] = "models/heroes/visage/visage_familiar.mdl"; //look like a sicknasty gargoyle
        //keyvalues["AttackAnimationPoint"] = 0.33; //attempt at fixing gargoyles attacking into the ground but doesnt really work
      
    }

	if(spawningZombie){
    //regular zombie specific stuff here
		keyvalues["StatusHealth"] = difficultyMultiplier * (50 + Math.max(Math.floor(time - 30) / 2, 0)) * ((f - 1) / 30 + 1);
		keyvalues["StatusHealthRegen"] = Math.floor(Math.sqrt(f)) / 2;
		keyvalues["ArmorPhysical"] = Math.floor(f - 1);
		keyvalues["AttackDamageMin"] = difficultyMultiplier * 37 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["AttackDamageMax"] = difficultyMultiplier * 45 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["BountyGoldMin"] = 30 * Math.sqrt(f);
		keyvalues["BountyGoldMax"] = 30 * Math.sqrt(f);
		keyvalues["ModelScale"] = Math.min(0.95 + 0.1 * f, 2);
		keyvalues["BountyXP"] = 75 * f;
        
        keyvalues["Ability1"] = "";
        keyvalues["Ability2"] = "";
	}
    
    if (spawningSkeletonZombie){
        //skeleton zombie specific stuff here
		keyvalues["StatusHealth"] = difficultyMultiplier * (25 + Math.max(Math.floor(time - 30) / 2, 0)) * ((f - 1) / 30 + 1);
		keyvalues["StatusHealthRegen"] = Math.floor(Math.sqrt(f)) / 2;
		keyvalues["ArmorPhysical"] = Math.floor(f - 1);
		keyvalues["AttackDamageMin"] = difficultyMultiplier * 37 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["AttackDamageMax"] = difficultyMultiplier * 45 * f * Math.min(1, time / 360 + 0.5);
		keyvalues["BountyGoldMin"] = 35 * Math.sqrt(f);
		keyvalues["BountyGoldMax"] = 35 * Math.sqrt(f);
		keyvalues["ModelScale"] = Math.min(0.95 + 0.1 * f, 2);
		keyvalues["BountyXP"] = 75 * f;
        keyvalues["AttackRate"] = 1; // Speed of attack.
        
        keyvalues["Ability1"] = "";
        keyvalues["Ability2"] = "";
    }
    

});

game.hook("Dota_OnUnitThink", function(unit){
	if(!unit.isValid()){
		//throw new Error("This should never happen");
        //check from newer zombie plugin:
        //throw new Error("This should never happen. Unit thinking without being valid: " + unit.getClassname());
	} else {
	
        var clsname = unit.getClassname();
        //for heroes
        if(unit.isHero()){
            //no hiding from zombies
            dota.setUnitState(unit, dota.UNIT_STATE_REVEALED, true);
            dota.setUnitState(unit, dota.UNIT_STATE_INVISIBLE, false);
            //if a hero is not at a shop, set hero to be at regular shop
            if(unit.netprops.m_iCurShop < 0 || unit.netprops.m_iCurShop > 2){
                unit.netprops.m_iCurShop = 0;
            }
            //netprops.m_iCurShop: 0, reg shop, 1, side shop, 2, secret shop
        }else if(clsname == "npc_dota_fort"){
            dota.setUnitState(unit, dota.UNIT_STATE_INVULNERABLE, true);
        }else if(clsname == "npc_dota_courier"){
            dota.setUnitState(unit, dota.UNIT_STATE_INVULNERABLE, true);
        }else if(unit.isZombie){
            //for zombies: remove them from the game
            if(unit.netprops.m_iHealth <= 0){
                unit.hero.zombies.remove(unit);
                dota.remove(unit);
            }
        }
    }
        
});

game.hook("OnEntityDestroyed", function(ent){
	if(ent.isZombie){
		ent.hero.zombies.remove(ent);
	}
});

// no longer need to disable blink items with flying zombies
// game.hook("Dota_OnBuyItem", function(unit, item, playerID, unknown){
	// if(item == "item_blink" || item == "item_recipe_force_staff" || item == "item_force_staff"){
		// return false;
	// }
// });

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
			}else if(time > 30) {
				hero.zombieFactor += factor * Math.pow(time / 180, 2);
			}
		}
	}
}

function spawnZombie(hero, factor){
    var zombieType = Math.floor((Math.random()*NUM_ZOMBIE_TYPES)+1); //generate a rand number between 1 and num types
    //var zombieType = SKELETON_ZOMBIE_TYPE; //debug: generate static type
    var zombie;
    
    if(zombieType==REGULAR_ZOMBIE_TYPE ){
    spawningZombie = true;
    zombie = dota.createUnit("npc_dota_unit_undying_zombie", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
    }else if(zombieType==FLYING_ZOMBIE_TYPE){
    spawningFlyingZombie = true;
    zombie = dota.createUnit("npc_dota_visage_familiar", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
    } else if(zombieType==SKELETON_ZOMBIE_TYPE){
    spawningSkeletonZombie = true;
    zombie = dota.createUnit("npc_dota_dark_troll_warlord_skeleton_warrior", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
    } else {
    //zombie = dota.createUnit("npc_dota_neutral_satyr_soulstealer", hero.netprops.m_iTeamNum == 2 ? 3 : 2);
    throw new Error("Error: zombie not spawned due to invalid zombie type");
    
    }

	spawningZombieFactor = factor;

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
    
	if(zombieType==REGULAR_ZOMBIE_TYPE ){
    spawningZombie = false;
    }else if(zombieType==FLYING_ZOMBIE_TYPE){
    spawningFlyingZombie = false;
    }else if(zombieType==SKELETON_ZOMBIE_TYPE){
    spawningSkeletonZombie = false;
    }
	
	return zombie;
}


var hasLost = false;
//defeat condition: if all heroes are dead on a team simultaneously
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


//add plugin settings on d2ware lobby (thanks Skino of Custom Spell Power)
plugin.get("LobbyManager", function(lobbyManager)
{
	var str = lobbyManager.getOptionsForPlugin("MoreZombiesSurvival")["Multiplier"];
	difficultyMultiplier = str.split("x")[0];
});


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