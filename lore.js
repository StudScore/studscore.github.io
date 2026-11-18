// StudScore collector lore: original theme stories and set notes for the popup.
// Theme keys are Rebrickable theme ids (the sub-theme id where sets actually live).
const LORE = {
  themes: {
    130: {
      title: "Classic Space",
      era: "1979-1987",
      story: "The first great space program sent blue, red, white, and yellow astronauts out to chart new worlds in boxy rockets, moonbases, and rovers. It is an optimistic age of discovery more than war: landing pads, radio towers, and crystal caches, with no formal enemy faction yet. Later space crews would look back on these explorers as the ones who opened the frontier.",
      factions: ["Classic Space astronauts"]
    },
    132: {
      title: "Futuron",
      era: "1987-1990",
      story: "On a gleaming, dome-lit colony, Futuron scientists and pilots took over the frontier in white and trans-blue gear. Their monorail, flyers, and crystal-powered city felt more civilian than military, a peaceful next chapter of Classic Space. That calm did not last: a darker rival, Blacktron, was already moving in the same sector.",
      factions: ["Futuron colonists", "Blacktron rivals"]
    },
    128: {
      title: "Blacktron I",
      era: "1987-1990",
      story: "Blacktron arrived as space's first real renegades: black-and-yellow ships with tinted canopies, secret bases, and a reputation for raiding official colonies. Their look was leaner and more menacing than the colorful explorer fleets, and their arrival turned space from a place you simply mapped into a place you had to police. Futuron and, later, the Space Police would spend years trying to pin them down.",
      factions: ["Blacktron renegades", "Futuron and Space Police"]
    },
    129: {
      title: "Blacktron II",
      era: "1991-1992",
      story: "Blacktron returned in a sharper uniform of black, white, and trans-neon green, with a more organized 'future generation' of raiders. Their new saucers, buggies, and message interceptors made the old yellow-trimmed ships look dated. Space Police II was created specifically to keep this second wave from running the spaceways.",
      factions: ["Blacktron Future Generation", "Space Police II"]
    },
    136: {
      title: "M:Tron",
      era: "1990-1991",
      story: "M:Tron was the industrial heart of the space lanes: a red, black, and trans-neon-yellow mining and transport corps whose trucks, cranes, and ships used huge magnets to haul crates and power crystals. They were tinkerers and haulers more than soldiers, keeping remote outposts supplied. When something valuable was on the move, M:Tron was usually the crew paid to get it there.",
      factions: ["M:Tron miners and haulers"]
    },
    139: {
      title: "Space Police I",
      era: "1989",
      story: "The first Space Police force was formed to bring Blacktron raiders in, not just chase them off. Their black-and-blue patrol craft carried lock-up pods and jail cells so a captured outlaw could be flown back to a precinct in orbit. It was the moment space storytelling gained cops, robbers, and a reason for a high-speed chase.",
      factions: ["Space Police", "Blacktron outlaws"]
    },
    140: {
      title: "Space Police II",
      era: "1992-1993",
      story: "A rebuilt Space Police unit took on Blacktron's second generation with heavier patrol ships, updated lock-ups, and trans-green canopies that echoed their quarry. They were the law in a busier, more crowded space era, chasing smugglers from hidden asteroids to official stations. If a neon-green Blacktron saucer ran, these were the officers in pursuit.",
      factions: ["Space Police II", "Blacktron II"]
    },
    141: {
      title: "Space Police III",
      era: "2009-2010",
      story: "Decades later the Space Police were back on the beat, now hunting a rogues' gallery of colorful alien criminals instead of a single rival fleet. Patrol ships, bike units, and a big prison transport tried to keep the spaceways safe from figures like Squidman, Kranxx, and Frenzy. It was a brighter, punchier revival of the old cops-and-robbers idea.",
      factions: ["Space Police", "Alien crime bosses and gangs"]
    },
    133: {
      title: "Ice Planet 2002",
      era: "1993-1994",
      story: "On a frozen world named for the year 2002, Commander Cold and his crew staked out a neon-orange foothold of ski-ships, ice cruisers, and chain-sawed landing pads. They were there to survey the ice, recover hidden technology, and survive storms that could bury a base overnight. There was no rival army on the ice, just the planet itself, and a few secrets worth freezing for.",
      factions: ["Ice Planet explorers"]
    },
    142: {
      title: "Spyrius",
      era: "1994-1996",
      story: "Spyrius was a spy network in red, black, and trans-red, famous for saucers, walkers, and little spy robots that could sneak into a lab and walk out with a data crystal. They stole technology rather than settling worlds, and their hidden mountain-and-crater bases made them hard to catch. Unitron was the high-tech force raised to keep those secrets from disappearing.",
      factions: ["Spyrius agents", "Unitron"]
    },
    145: {
      title: "Unitron",
      era: "1994-1995",
      story: "Unitron was a compact, high-tech defense force in black, white, and trans-blue, built around a monorail station and sharp-nosed fighters. They were the official answer to Spyrius: fewer sets, but a clearly military, gadget-heavy look. If a red spy saucer lit up a sensor grid, Unitron was supposed to be first on the scene.",
      factions: ["Unitron", "Spyrius"]
    },
    131: {
      title: "Exploriens",
      era: "1996",
      story: "The Exploriens were scientists first, soldiers second, scanning alien landscapes for fossils, signals, and magnetic traces of older civilizations. Their white-and-blue ships carried scanners and printed 'discovery' tiles that could be read as clues. In a space era full of spies and raiders, they were the crew still trying to learn what the galaxy actually was.",
      factions: ["Exploriens scientists"]
    },
    144: {
      title: "UFO",
      era: "1997-1998",
      story: "A fleet of saucers and cyber-fighters arrived with trans-green canopies and pilots whose helmets showed glowing, almost mechanical minds. These were not human astronauts in a new paint job: they were visiting, or invading, as a fully alien force. Their odd, organic-meets-machine ships made the 1990s space line feel like first contact from the other side.",
      factions: ["UFO alien crews"]
    },
    134: {
      title: "Insectoids",
      era: "1998-1999",
      story: "Insectoids were a bug-like alien species whose ships looked half-craft and half-creature, in neon greens, purples, and trans-yellow. They swarmed after energy sources on strange worlds, with locust- and beetle-shaped flyers and a queen-style command vibe. If UFO was first contact, Insectoids were the swarm that followed.",
      factions: ["Insectoid aliens"]
    },
    135: {
      title: "Life on Mars",
      era: "2001",
      story: "Human explorers finally reached a living Mars and found Martians already at home among the canyons and crystal vents. Some encounters were curious and almost friendly; others went wrong in a hurry, with mechs and buggies facing native walkers. It was a rare space story about sharing a planet, not just planting a flag.",
      factions: ["Human Mars mission", "Martians"]
    },
    137: {
      title: "Mars Mission",
      era: "2007-2008",
      story: "A later human expedition came to Mars for energy crystals and found a hostile alien force already harvesting the same veins. Armed dropships, drilling walkers, and a crater command base went up against alien motherships and glowing-eyed raiders. Unlike Life on Mars, this was a straight fight over the planet's most valuable resource.",
      factions: ["Human Mars Mission (MX/MT crews)", "ETX aliens"]
    },
    127: {
      title: "Alien Conquest",
      era: "2011",
      story: "The invasion came to Earth itself: saucers over cities, abduction chambers, and aliens draining power from the planet. The Alien Defense Unit answered with armored trucks, jet interceptors, and a HQ built to take the fight back. It is a classic 'defend the Earth' story, with civilians caught in the middle and ADU teams racing to shut the invasion down.",
      factions: ["Alien Defense Unit", "Invading aliens"]
    },
    146: {
      title: "Galaxy Squad",
      era: "2013",
      story: "When a swarm of insectoid 'Swarm Eater' aliens began overrunning worlds, Galaxy Squad deployed in color-coded teams of pilots, troopers, and mechs. Orange, green, red, and blue units each brought their own vehicles, from compact bugs-versus-buggies skirmishes to huge battle bases. It is a team-up bug hunt on a galactic scale.",
      factions: ["Galaxy Squad (color teams)", "Swarm Eater aliens"]
    },
    308: {
      title: "Aquanauts",
      era: "1995-1996",
      story: "The Aquanauts were an official undersea crew racing to recover hydrolator crystals from the ocean floor before anyone else could. In blue, black, and trans-yellow gear they launched subs, scooters, and a full seafloor lab, treating the deep as a worksite with real stakes. Their biggest problem was not the pressure: it was the Aquasharks trying to steal every crystal they found.",
      factions: ["Aquanauts", "Aquasharks"]
    },
    311: {
      title: "Aquasharks",
      era: "1995-1996",
      story: "The Aquasharks were crystal pirates in shark-nosed subs, prowling the same reefs the Aquanauts were trying to survey. Their hideout was a crystal cave, and their vehicles looked built to ram, snatch, and vanish into the dark. In the first Aquazone war, they were the reason no hydrolator crystal ever sat unguarded.",
      factions: ["Aquasharks", "Aquanauts"]
    },
    309: {
      title: "Aquaraiders I",
      era: "1997",
      story: "A third deep-sea faction arrived with amber canopies and heavy wrecking gear, less like a navy and more like salvage raiders. The Aquaraiders punched into reefs and wrecks for the same hydrolator crystals everyone else was fighting over. They kept the Aquazone race from ever being a simple two-sided feud.",
      factions: ["Aquaraiders", "Aquanauts and Aquasharks"]
    },
    312: {
      title: "Hydronauts",
      era: "1998-1999",
      story: "The Hydronauts picked up the official crystal mission with sleeker silver-and-blue craft and a bigger seafloor station. They were the next-generation good guys of Aquazone, better equipped for long dives and crystal processing. Waiting for them in the trenches was a new enemy: the mutant Stingrays.",
      factions: ["Hydronauts", "Stingrays"]
    },
    313: {
      title: "Stingrays",
      era: "1998",
      story: "The Stingrays were mutant, ray-like beings who claimed the deep as their territory and the crystals as their own. Their organic-looking craft and stormer command ship made them feel less like rival divers and more like the ocean fighting back. Hydronaut crews had to out-think creatures that already lived where humans were only visiting.",
      factions: ["Stingrays", "Hydronauts"]
    },
    310: {
      title: "Aqua Raiders",
      era: "2007",
      story: "A treasure-diving crew descended on a forgotten seafloor littered with wrecks and gold, only to find the hoard guarded by colossal sea creatures. There is no rival human navy in this story: the anglerfish, tiger shark, lobster, crab, and squid are the bosses of the deep. Every Aqua Raiders machine is a tool for getting in, grabbing the treasure, and getting out alive.",
      factions: ["Aqua Raiders divers", "Giant deep-sea creatures"]
    },
    315: {
      title: "Atlantis",
      era: "2010-2011",
      story: "Divers located the lost city of Atlantis and began hunting for golden keys and relics that could open its secrets. Atlantean guardians (shark, manta, squid, and other warriors) rose to stop them, turning the ruins into a gauntlet. It is a treasure hunt and a myth coming true at the same time, with portals and statues that are never just decoration.",
      factions: ["Atlantis divers", "Atlantean guardians"]
    },
    297: {
      title: "Adventurers: Desert",
      era: "1998-2000",
      story: "Johnny Thunder, Dr. Kilroy, and Pippin Reed went to Egypt after legendary relics, dodging traps, statues, and the occasional mummy. Hot on the same trail was Lord Sam Sinister (also known as Baron von Barron), a rival treasure hunter who would rather steal a find than share it. Desert Adventurers is classic pulp archaeology: maps, temples, and a race to the relic.",
      factions: ["Johnny Thunder's adventurers", "Lord Sam Sinister and his hired help"]
    },
    299: {
      title: "Adventurers: Jungle",
      era: "1999",
      story: "The same adventuring crew pushed into a dense jungle after festival treasures and hidden shrines, this time dealing with river boats, vines, and rival expedition leaders. Local dangers and competing treasure hunters made the jungle as treacherous as any tomb. If the desert was about ruins in the sand, the jungle was about disappearing into the trees.",
      factions: ["Johnny Thunder's adventurers", "Rival jungle treasure hunters"]
    },
    298: {
      title: "Adventurers: Dino Island",
      era: "2000",
      story: "A remote island turned out to be home to living dinosaurs, and the Adventurers arrived to study and protect them. Hunter Mr. Cunningham had other plans, hoping to capture the animals for profit. The story is a rescue as much as an expedition: keep the dinosaurs free, and keep the team off the menu.",
      factions: ["Johnny Thunder's adventurers", "Mr. Cunningham's hunters"]
    },
    300: {
      title: "Adventurers: Orient Expedition",
      era: "2003",
      story: "Johnny Thunder's last great run was a globe-spanning trek through India, China, and the Himalayas in search of the Golden Dragon and other legendary prizes. Lord Sam Sinister returned as a rival, and local rulers, pilots, and sherpas became part of the chase. It is Adventurers at its most wide-ranging: trains, palaces, balloons, and mountain temples on one itinerary.",
      factions: ["Johnny Thunder's adventurers", "Lord Sam Sinister"]
    },
    442: {
      title: "Rock Raiders",
      era: "1999-2000",
      story: "The mining crew of the LMS Explorer was thrown off course and stranded on a hostile, crystal-rich planet. To survive and reopen a way home they had to drill, haul, and build an underground HQ while Rock Monsters and other creatures were drawn to the same energy crystals. Every walker, loader, and hover scout exists to keep the crew alive one tunnel deeper.",
      factions: ["Rock Raiders mining crew", "Rock Monsters"]
    },
    51: {
      title: "Arctic",
      era: "1998-2000",
      story: "A Town expedition set up an orange-clad research camp at the edge of the ice, complete with scooters, planes, and a polar base. The story is exploration rather than war: studying the ice, tracking wildlife, and getting a stranded teammate home through a blizzard. It is one of the last classic Town adventure waves, a cold-weather counterpart to jungle and desert treks.",
      factions: ["Arctic explorers"]
    },
    304: {
      title: "Alpha Team",
      era: "2001",
      story: "Alpha Team is a secret agent unit (Dash, Charge, Cam, and their crew) formed to stop Evil Ogel from blanketing the world with mind-control orbs. Their first missions were a high-tech game of cat and mouse against Ogel's drones and command vehicles. It is a gadget-heavy spy story with a single, very theatrical villain at the center.",
      factions: ["Alpha Team", "Evil Ogel and his drones"]
    },
    305: {
      title: "Alpha Team: Mission Deep Sea",
      era: "2002-2003",
      story: "Ogel took the fight underwater, mutating sea creatures and hiding his plans in submerged bases. Alpha Team answered with dive suits, subs, and a robot diver to chase him through the trenches. The orbs and mind-control plot continued, just with sonar and squid instead of jeeps.",
      factions: ["Alpha Team divers", "Ogel and his mutant sea forces"]
    },
    306: {
      title: "Alpha Team: Mission Deep Freeze",
      era: "2004",
      story: "The last Alpha Team campaign followed Ogel to an icy mountain fortress, where snow crawlers and freeze weapons raised the stakes again. Agents arrived in tracked command vehicles, ice blades, and a blizzard blaster to shut the operation down. If they failed here, Ogel's orbs would have a frozen fortress to spread from.",
      factions: ["Alpha Team", "Ogel's ice forces"]
    },
    302: {
      title: "Agents",
      era: "2008-2009",
      story: "A covert agency sent field operatives (Chase, Charge, Fuse, Trace, and Swipe among them) on numbered missions to stop Dr. Inferno from taking over the world. Inferno's henchmen specialized in chaos, from swamp raids and gold heists to a volcano headquarters. The sets play like spy-movie set pieces: jetpacks, turbocars, a mobile command center, and a final run at the crater base.",
      factions: ["Agents", "Dr. Inferno and his henchmen"]
    },
    303: {
      title: "Ultra Agents",
      era: "2014-2015",
      story: "In Astor City, a new generation of agents took on villains who could melt streets, turn invisible, or drill through a bank vault, with the reality-warping AntiMatter as the larger threat. Solomon Blaze and his team worked from a high-tech HQ and later a seaborne headquarters, deploying stealth cars, an UltraCopter, and gadget-heavy patrols. It is Agents updated for a comic-book city in crisis.",
      factions: ["Ultra Agents", "AntiMatter and the Astor City villains"]
    },
    439: {
      title: "Power Miners",
      era: "2009-2010",
      story: "A string of earthquakes led a mining crew deep underground, where they found energy crystals and the Rock Monsters who craved them. The miners built heavy drills, crushers, and titan mechs to contain the creatures and keep the surface from splitting open. It is a cousin to Rock Raiders, but the monsters are the main event, not just a hazard in the tunnel.",
      factions: ["Power Miners", "Rock Monsters"]
    },
    385: {
      title: "Dino Attack / Dino 2010",
      era: "2005-2006",
      story: "Mutant dinosaurs overran the city, and a small strike team rolled out in specialized combat vehicles to take the streets back. Sold as Dino Attack in some regions and Dino 2010 in others, it is the same emergency: claws versus armor in a ruined urban landscape. The dinosaurs are the disaster; the team is whoever is still willing to drive toward them.",
      factions: ["Dino Attack / Dino 2010 team", "Mutant dinosaurs"]
    },
    437: {
      title: "Pharaoh's Quest",
      era: "2011",
      story: "Explorers in the desert awoke a long-buried threat: Pharaoh Amset-Ra and a cursed army of mummies, cobras, and scorpion guardians. The team hunted golden treasures and relics that could keep the pharaoh from reclaiming his power. Temples, flying mummies, and a scorpion pyramid turned archaeology into a rescue of the present from the past.",
      factions: ["Pharaoh's Quest explorers", "Amset-Ra and his cursed army"]
    },
    558: {
      title: "Monster Fighters",
      era: "2012",
      story: "Dr. Rodney Rathbone assembled a crew of monster hunters to stop Lord Vampyre from gathering moonstones and blotting out the sun. Werewolves, mummies, swamp creatures, and a mad scientist's monster all had their own haunted corners of the map, ending at a vampyre castle and a towering haunted house. It is a loving tour of classic movie monsters, with the hunters always one moonstone behind.",
      factions: ["Monster Fighters", "Lord Vampyre and the monsters"]
    },
    464: {
      title: "Time Cruisers",
      era: "1996-1997",
      story: "Inventor Dr. Cyber and his young partner Tim hopped through history in ramshackle time machines stitched together from whatever era they had just visited. The line is more comic adventure than time war: pirates one minute, knights or spacemen the next, with a rival time traveler sometimes in pursuit. Their best machines look like they might fall apart if the next jump goes wrong.",
      factions: ["Time Cruisers", "Rival time travelers"]
    },
    189: {
      title: "Classic Castle",
      era: "1978-1983",
      story: "The earliest Castle sets established the yellow-walled kingdom of knights, horses, and a royal stronghold before the great crest rivalries were named. These were the first brick-built medieval scenes: gates, towers, and simple tournaments. Later factions would split the kingdom into lions, falcons, and forests, but this is where the map began.",
      factions: ["Classic knights"]
    },
    187: {
      title: "Black Falcons",
      era: "1984-1992",
      story: "The Black Falcons were a blue-and-black knightly house marked by a falcon crest, and one of Castle's first true rival factions. They held their own fortress and often stood opposite the lion-bearing Crusaders in sieges and border fights. In the classic Castle map, a falcon on the shield usually meant the other side of the field.",
      factions: ["Black Falcons", "Crusaders (Lion Knights)"]
    },
    199: {
      title: "Crusaders (Lion Knights)",
      era: "1984-1992",
      story: "Known in many catalogs as Lion Knights, the Crusaders were the lion-crested royal faction of classic Castle, with guarded inns, tournaments, and a king in the later years. They were often the 'home' side against Black Falcons, Forestmen, or Black Knights. If a set has a lion shield and a busy castle yard, it is usually their story.",
      factions: ["Crusaders (Lion Knights)", "Black Falcons and rival houses"]
    },
    194: {
      title: "Forestmen",
      era: "1987-1990",
      story: "The Forestmen were green-clad outlaws of the woods, closer to folk-hero rogues than to a knightly house. They operated from tree hideouts and woodland camps, raiding rich convoys and slipping away through the leaves. In Castle lore they are the reminder that not every battle happens at a gate.",
      factions: ["Forestmen", "Lion Knights and other houses"]
    },
    188: {
      title: "Black Knights",
      era: "1988-1994",
      story: "The Black Knights were a heavier, more imposing house than the Falcons, with a dragon-tinged crest and some of the era's biggest fortresses. They pushed Castle toward darker colors and larger keeps, and they often stood as the armored rival of the lion factions. When a castle looked hard to take, it was often theirs.",
      factions: ["Black Knights", "Lion Knights and royal houses"]
    },
    203: {
      title: "Wolfpack",
      era: "1992-1993",
      story: "The Wolfpack was a small band of forest bandits marked by a wolf emblem, more brigand than knight. They lived by ambush, hiding out in compact woodland forts and preying on travelers. There were only a handful of sets, but they carved out a clear niche: Castle's outlaws after the Forestmen had faded.",
      factions: ["Wolfpack bandits", "Castle authorities"]
    },
    190: {
      title: "Dragon Masters (Dragon Knights)",
      era: "1993-1995",
      story: "Led in spirit by the wizard Majisto, the Dragon Masters brought working magic and fire-breathing dragons into Castle in a way earlier houses never had. Dragon-crested knights held hilltop strongholds and rode beasts that could scorch a gatehouse. In Rebrickable's catalog they appear as Dragon Knights, but collectors know them as the Dragon Masters.",
      factions: ["Dragon Masters", "Royal and rival knights"]
    },
    201: {
      title: "Royal Knights",
      era: "1995-1997",
      story: "The Royal Knights were the king's own army, in bold royal colors, raised to hold the realm against dragons and darker magic. Their castle and king minifigure gave Castle a clear crown again after years of rival crests. If the Dragon Masters brought the fire, the Royal Knights were the ones expected to put it out.",
      factions: ["Royal Knights", "Dragons and rival forces"]
    },
    191: {
      title: "Dark Forest",
      era: "1996",
      story: "Dark Forest was a short, shadowy return to woodland outlaws, a spiritual cousin of the Forestmen with a gloomier hideout among the trees. The band was small, but it kept the idea of a forest faction alive between classic Castle and the spookier Fright Knights. Travelers were wise not to leave the road.",
      factions: ["Dark Forest outlaws"]
    },
    195: {
      title: "Fright Knights",
      era: "1997-1998",
      story: "Willa the Witch and Basil the Bat Lord turned Castle fully gothic: bat-winged banners, crystal balls, a dark dragon, and a fortress that looked more haunted than held. The Fright Knights were less a chivalric order than a night-time power, unsettling the older houses. It is Castle at its most Halloween.",
      factions: ["Fright Knights", "Opposing knights"]
    },
    197: {
      title: "Knights Kingdom I",
      era: "2000",
      story: "King Leo and the lion court of Knights Kingdom faced Cedric the Bull and his rebellious bull-crested knights. Princess Storm, Queen Leonora, and a royal castle stood at the center, with Cedric trying to batter his way to the throne. It is a compact, character-led Castle chapter: one kingdom, one usurper, one siege.",
      factions: ["King Leo's knights", "Cedric the Bull and the Bulls"]
    },
    198: {
      title: "Knights Kingdom II",
      era: "2004-2006",
      story: "In the land of Morcia, color-coded hero knights (Jayko, Santis, Rascus, Danju, and later others) collected shields of power to stop the rogue knight Vladek. The line mixed Castle with collectible armor and action-figure posing, more saga than siege engine. It is a different Knights Kingdom from King Leo's: a team of champions against a single dark knight and his army.",
      factions: ["Knights of Morcia", "Vladek and his shadow forces"]
    },
    193: {
      title: "Fantasy Era",
      era: "2007-2009",
      story: "Castle returned in a high-fantasy key: Crown Knights defending the realm against skeleton armies, troll war parties, an evil wizard, and the occasional dragon, with dwarf allies in the mix. It brought non-human factions back to the walls in a big way. If classic Castle was rival houses, Fantasy Era is a full monster war for the crown.",
      factions: ["Crown Knights and dwarves", "Skeleton and troll forces"]
    },
    196: {
      title: "Kingdoms",
      era: "2010-2012",
      story: "Kingdoms stripped the skeletons back out and returned to a two-house war: a lion kingdom against a dragon kingdom, with jousts, mills, and proper medieval towns in between. It is Castle at its most classic after the fantasy years, all crests, catapults, and captured kings. Everyone in the countryside eventually had to pick a lion or a dragon.",
      factions: ["Lion Kingdom", "Dragon Kingdom"]
    },
    474: {
      title: "Vikings",
      era: "2005-2006",
      story: "Viking warriors launched longships and built a timber fortress to face the monsters of Norse myth: the Fenris wolf, a wyvern, the Midgard Serpent, and dragons named for old sagas. The story is less about rival villages than about a people holding the shoreline against legendary beasts. Their catapults and heavy axes exist because a dragon does not care about a shield wall.",
      factions: ["Vikings", "Mythic dragons and beasts"]
    },
    434: {
      title: "Ninja",
      era: "1998-2000",
      story: "Long before Ninjago, a feudal Japan-inspired line set ninja, samurai, and bandits around hidden fortresses, river outposts, and a shogun's keep. Loyalty, stealth, and castle intrigue mattered more than elemental powers. It is a compact, earthy ninja story, and a distant ancestor of the later ninja saga.",
      factions: ["Ninja", "Samurai and shogunate forces", "Bandits"]
    },
    148: {
      title: "Classic Pirates",
      era: "1989-1997",
      story: "Captain Redbeard's crew hunted treasure across tropical islands while the Imperial Soldiers, and later Imperial Guards and the Armada, tried to hunt them. The Black Seas Barracuda, island hideouts, and governor's forts made this the defining pirate era. Later reissues kept the same lagoon war in circulation into the early 2000s.",
      factions: ["Redbeard's pirates", "Imperial Soldiers, Guards, and Armada"]
    },
    153: {
      title: "Pirates II",
      era: "2009-2013",
      story: "Pirates returned with Captain Brickbeard and a new imperial navy, restaging the old ship-versus-fort battles in a brighter, more theatrical wave. Treasure chests, cannons, and a crowded harbor town brought the lagoon back for a new generation. The feud is familiar on purpose: pirates, soldiers, and one more race to the gold.",
      factions: ["Brickbeard's pirates", "Imperial flag soldiers"]
    },
    154: {
      title: "Pirates III",
      era: "2015",
      story: "A short 2015 return put pirates and blue-coat soldiers back on the water for one more season of ship raids and island hideouts. It did not try to reinvent the map, just to let the classic feud sail again. If you know Redbeard and the Imperials, you already know the stakes.",
      factions: ["Pirates", "Imperial soldiers"]
    },
    475: {
      title: "Western",
      era: "1996-1997",
      story: "The Western line staged a frontier of sheriff's offices, cavalry forts, outlaw hideouts, stagecoaches, and indigenous villages of the plains. Play was built around chases, gold shipments, and uneasy meetings at the edge of a fort or river. It is a 1990s adventure take on the American West, with several communities sharing the same dusty map.",
      factions: ["Sheriffs and cavalry", "Outlaws", "Native villages of the plains"]
    },
    324: {
      title: "Bionicle",
      era: "2001-2016",
      story: "On a world of elemental biomes, Toa heroes gathered Kanohi masks and used them to protect Matoran villagers from Makuta and a long line of later threats. The saga grew from island adventures into a huge legend of the Great Spirit, hidden cities, and the true nature of their universe, then was retold in a 2015 reboot. It is one of the deepest original story worlds ever built in these bricks.",
      factions: ["Toa and Matoran", "Makuta and opposing forces"]
    },
    400: {
      title: "Hero Factory",
      era: "2010-2014",
      story: "Hero Factory is a high-tech plant that builds heroic robots (Stormer, Furno, Breez, and their teammates) and ships them out to stop villains, breakouts, and later a brain-controlling alien invasion. It inherited Bionicle's build style but swapped myth for a comic-book police-and-rescue tone. Every hero upgrade wave is a new assignment, not a new legend.",
      factions: ["Hero Factory heroes", "Villains and later brain-controlled creatures"]
    },
    401: {
      title: "Hero Factory",
      era: "2010-2014",
      story: "These are the Hero Factory agents themselves, from the first-mission heroes to later 2.0, 3.0, and powered-up rebuilds. Furno, Stormer, Breez, Bulk, Surge, Stringer, Nex, Evo, and Rocka each went out as specialized responders. Their story is the same factory-and-field saga, told through the heroes' own builds.",
      factions: ["Hero Factory heroes", "Villains"]
    },
    403: {
      title: "Hero Factory Villains",
      era: "2010-2014",
      story: "Opposite the heroes stood a rotating roster of breakout criminals, fire villains, and later brain-controlled beasts, from Von Nebula and Corroder to Fire Lord and Black Phantom. Each villain build is a case file: a named threat the factory had to design a counter for. Together they are the reason Hero Factory never shuts down for the night.",
      factions: ["Hero Factory villains", "Heroes"]
    },
    20: {
      title: "Slizer (Throwbots)",
      era: "1999-2000",
      story: "Called Throwbots in some regions and Slizer in others, these disc-hurling robots came from elemental zones (fire, ice, city, jungle, and more) and resolved fights by throwing battle discs. A later plot pulled them into a larger conflict after a cosmic upheaval reshaped their world. They are part sports mech, part territorial guardian.",
      factions: ["Elemental Slizers / Throwbots"]
    },
    16: {
      title: "RoboRiders",
      era: "2000",
      story: "RoboRiders were motorcycle-like robotic riders, each tuned to an environment such as swamp, frost, or lava, and sent to fight a spreading computer virus. The line was short and punchy: one rider, one terrain, one mission. If Slizer threw discs, RoboRiders ran the problem down on wheels.",
      factions: ["RoboRiders", "The virus threat"]
    },
    685: {
      title: "Galidor",
      era: "2002",
      story: "Tied to a short-lived live-action series, Galidor followed Nick Bluetooth and his allies as they hopped between worlds to stop the conqueror Gorm. Figures used mix-and-match limbs so characters could change form, matching a story about unstable identities and strange planets. It is a curious, brief side road in the early-2000s story catalog.",
      factions: ["Nick Bluetooth and allies", "Gorm and his forces"]
    },
    389: {
      title: "Exo-Force",
      era: "2006-2008",
      story: "On Sentai Mountain, humans and robots once lived together until the golden robot Meca One led a revolt that split the mountain in two. Sensei Keiken trained elite pilots (Hikaru, Takeshi, Ryo, and Ha-Ya-To, with Hitomi in the story) to fight back in anime-inspired battle machines. The war moved from the mountain fortress to the Golden City and finally into the jungle, and the story was still unfinished when the line ended.",
      factions: ["Exo-Force human pilots", "Meca One and the robot army"]
    },
    435: {
      title: "Ninjago",
      era: "2011-2026",
      story: "Young ninja trained by Master Wu learned Spinjitzu to protect their world, first from Lord Garmadon and the Serpentine, then from a long run of new threats. Kai, Cole, Jay, Zane, Nya, and Lloyd grew from students into elemental masters over years of seasons, movies, and rebuilds. It is the flagship original ninja saga, still adding chapters.",
      factions: ["Ninja and allies", "Garmadon, Serpentine, and later villains"]
    },
    571: {
      title: "Legends of Chima",
      era: "2013-2015",
      story: "Animal tribes of Chima (Lions, Crocodiles, Eagles, Wolves, and many more) drew power from CHI falling off Mount Cavora. A feud between lion prince Laval and crocodile prince Cragger exploded into a tribal war, later dwarfed by an ice-hunter invasion from the north. Vehicles, Speedorz, and tribal legends all orbit that fight over CHI.",
      factions: ["Lion Tribe and allies", "Crocodile Tribe and rivals", "Ice Hunters"]
    },
    605: {
      title: "Nexo Knights",
      era: "2016-2018",
      story: "In the kingdom of Knighton, high-tech knights downloaded Nexo powers into their shields to fight Jestro, the Book of Monsters, and later Monstrox's stone and lava threats. Clay, Macy, Lance, Aaron, and Axl were medieval knights with a digital upgrade, defending a kingdom that mixed castles with computers. It is chivalry with a download bar.",
      factions: ["Nexo Knights", "Jestro, Monstrox, and the monster armies"]
    },
    693: {
      title: "Monkie Kid",
      era: "2020-2025",
      story: "MK is a noodle-shop delivery kid who inherits the Monkey King's staff and a share of his power, then has to stop the Demon Bull King and a growing list of legendary demons. The tone is funny and kinetic, with huge mechs and city-sized showdowns drawn from Journey to the West. It is a modern myth about a kid who was not trying to be a hero.",
      factions: ["Monkie Kid and the Monkey King", "Demon Bull King and other demons"]
    },
    749: {
      title: "Dreamzzz",
      era: "2023-2026",
      story: "Kids cross into the Dream World, where imagination can be built into vehicles and creatures, and where nightmare forces try to take that power away. The Nightmare King and later dream villains hunt the dreamers, who fight back with wild, story-logic builds. It is a bedtime adventure that treats creativity itself as the weapon.",
      factions: ["Dream chasers", "Nightmare King and dream villains"]
    },
    676: {
      title: "Hidden Side",
      era: "2019-2020",
      story: "The town of Newbury is haunted, and Jack Davids, Parker L. Jackson, and friends hunt ghosts that only fully appear when you look at the sets through an app. Possessed school buses, diners, and a lighthouse turn everyday places into ghost traps. It is a contemporary ghost story, half brick build and half hidden-layer hunt.",
      factions: ["Hidden Side ghost hunters", "Newbury's ghosts"]
    },
    713: {
      title: "VIDIYO",
      era: "2021",
      story: "VIDIYO is a music-video world of Bandmates, BeatBits, and genre-bending stages, where the play is to build a band and then watch an app turn it into a wild video. Punk, hip-hop, folk, and other style tribes each get their own look and props. There is less of a single war here than a battle of the bands.",
      factions: ["VIDIYO Bandmates and genre crews"]
    },
    600: {
      title: "Elves",
      era: "2015-2018",
      story: "Emily Jones stumbled into Elvendale and befriended elemental elves of fire, earth, water, and wind. Together they protected magical creatures, mended old rivalries, and faced goblin threats and a dark sorceress in later seasons. It is a character-rich fantasy about finding your place in a hidden world.",
      factions: ["Emily Jones and the elves", "Goblin and dark-magic threats"]
    },
    390: {
      title: "Fabuland",
      era: "1979-1989",
      story: "Fabuland is a gentle storybook town of animal-headed residents, complete with bakeries, fire stations, cars, and neighborhood errands. Edward Elephant and his neighbors lived in a world without a dark lord, just everyday adventures in a brightly built village. For many collectors it is the first story town they can still name by character.",
      factions: ["Fabuland townsfolk"]
    },
    158: {
      title: "Star Wars",
      era: "1999-2026",
      story: "These sets retell the saga of Jedi, Sith, clones, rebels, and bounty hunters across the films, shows, and later eras, from small fighters to huge display models. Helmets, droids, and ships all point back to that same galaxy-spanning conflict. In StudScore they are licensed story sets, not an original brick universe.",
      factions: ["Jedi, Rebels, and the Republic", "Sith, Empire, and First Order"]
    },
    246: {
      title: "Harry Potter",
      era: "2001-2026",
      story: "Brick versions of Hogwarts, Diagon Alley, and the wider wizarding world follow Harry, his friends, and their teachers through each school year and the war with Voldemort. Castles, shops, and famous scenes are built so collectors can walk the story room by room. The houses and the Death Eaters are the two poles of the conflict.",
      factions: ["Hogwarts students and the Order", "Death Eaters and dark forces"]
    },
    695: {
      title: "DC Super Heroes",
      era: "2011-2026",
      story: "Batman, Superman, Wonder Woman, and the wider DC roster appear here in street-level chases, rooftop battles, and bigger Justice League showdowns. Many sets live in related sub-themes such as Batman, but they all draw on the same hero-and-rogues-gallery stories. Gotham and Metropolis are never quiet for long.",
      factions: ["DC heroes", "Supervillains and rogues galleries"]
    },
    696: {
      title: "Marvel Super Heroes",
      era: "2012-2026",
      story: "Avengers, Spider-Man, the X-Men, and other Marvel heroes are built in their comic and film moments, from street brawls to world-ending team-ups. Related sub-themes hold many of the individual teams, but this is the shared Marvel umbrella. Heroes gather, villains escalate, and the skyline takes the hit.",
      factions: ["Marvel heroes", "Supervillains and rival powers"]
    },
    781: {
      title: "The Infinity Saga",
      era: "2021-2026",
      story: "These Marvel sets focus on the film run from the early Avengers through the Infinity Stones, Thanos, and the aftermath. Helmets, compact display builds, and famous pairings (like Rocket and Groot) freeze specific movie moments rather than inventing a new plot. It is the cinematic saga, told as shelf pieces.",
      factions: ["Avengers and allies", "Thanos and the film saga's villains"]
    },
    602: {
      title: "Jurassic World",
      era: "2015-2026",
      story: "Visitors, rangers, and researchers keep trying to contain dinosaurs that will not stay contained, from park attractions to later loose-dinosaur chaos. The sets bounce between gates, labs, and escape scenes, with the animals as the real stars. If a fence looks tall enough, it probably is not.",
      factions: ["Park staff, rangers, and visitors", "Dinosaurs"]
    },
    776: {
      title: "Pokémon",
      era: "2026",
      story: "These sets bring Trainers and Pokémon into brick form, from posable display figures to Smart Play battle and adventure scenes. Some builds are quiet character studies; others stage concerts, berry work, buggies, or championship matchups. The story is the one Trainers already know: partner with Pokémon, take on the next challenge, and maybe evolve along the way.",
      factions: ["Trainers and partner Pokémon"]
    },
    770: {
      title: "Horizon Adventures",
      era: "2025",
      story: "A thousand years after the old world fell, machine hunter Aloy, raised as an outcast of the Nora tribe, sets out with her friend Varl to learn where she came from. The wilds are full of animal-like machines such as the Sawtooth and Shell-Walker, while the Eclipse cult serves HADES, a rogue AI that wants to wake the old world's deadliest machines. The LEGO game and set retell that first Horizon Zero Dawn chapter as a bright, jokey hunt, with fire, shock, and chill arrows doing most of the talking.",
      factions: ["Aloy, Varl, and the Nora", "The Eclipse and HADES", "Machines"]
    },
    764: {
      title: "The Legend of Zelda",
      era: "2024-2026",
      story: "In the kingdom of Hyrule, the hero Link and Princess Zelda keep rising against Ganondorf, who wants the Triforce and the power it holds. The sets return to Ocarina of Time, with the Great Deku Tree that sends Link out with the fairy Navi and the last battle in the ruins of Ganon's Castle, and the Deku Tree build can also be put together as it looks in Breath of the Wild. Whatever the era, the Master Sword ends up in the right hands.",
      factions: ["Link, Zelda, and Hyrule's allies", "Ganondorf and Ganon"]
    },
    690: {
      title: "Super Mario",
      era: "2020-2026",
      story: "Mario, and later Luigi and Peach, arrived as interactive figures that read colored tiles and Action Tags, so a course of pipes, ? Blocks, and Goombas becomes a coin-scoring level you build yourself. Bowser, his Koopalings, and a long line of Mushroom Kingdom foes wait at the end of the run. Alongside the play courses, adult display pieces like a giant Bowser and the Game Boy treat Nintendo history itself as the treasure.",
      factions: ["Mario, Luigi, Peach, and friends", "Bowser and his minions"]
    },
    721: {
      title: "Icons",
      era: "2022-2026",
      story: "Icons is LEGO's adult display line, the name Creator Expert took on in 2022: modular buildings, classic vehicles, and big licensed showpieces from films and games. There is no single storyline; each set is a tribute to one subject, from a posable Toothless to Sauron's helmet looming over its stand. The plot is whatever your shelf is about.",
      factions: ["Display builds from many worlds"]
    },
    608: {
      title: "Disney",
      era: "2016-2026",
      story: "Disney sets gather a century of animated characters, from Mickey and friends and the Disney Princesses to Stitch, into castles, cottages, and brick-built characters. Rather than one shared plot, each set replays a favorite film moment or simply captures a character's personality. Villains drop in where the movies need them, but the charm usually wins.",
      factions: ["Disney heroes and friends", "Disney villains"]
    },
    769: {
      title: "Botanicals",
      era: "2021-2026",
      story: "Botanicals began in January 2021 as the Botanical Collection with a Flower Bouquet and a Bonsai Tree, then became its own Botanicals theme in 2025. The sets are bouquets, potted plants, and arrangements built from bricks, often using pieces in surprising ways to make petals and leaves. There is no story to follow, only a display that never needs watering.",
      factions: ["Flowers, plants, and arrangements"]
    },
    577: {
      title: "Minecraft",
      era: "2013-2026",
      story: "Steve, Alex, and later heroes survive a blocky world of crafting, villages, the Nether, and the End, facing mobs after dark and building their way out of trouble. The sets turn game biomes into compact dioramas: a base, a cave, a raid, a rare mob. It is survival and creativity, with Creepers always a little too close.",
      factions: ["Players and villagers", "Hostile mobs"]
    }
  },
  sets: {
    "11513-1": "A dark-hued Botanicals arrangement of tulips, roses, an anemone, petunia, dahlia, mistflower, and pimpernel on a modular base you can rearrange. It is a display piece rather than a story set, built for mood and custom bouquets.",
    "72159-1": "Jigglypuff takes a tiny concert stage with a microphone and boombox, ready to sing the room to sleep the way it does in the anime. In the Pokémon lineup this is the compact gig: a performer, not a battler, with Smart Play hooks if you add a Smart Brick later.",
    "72155-1": "Bulbasaur and Bidoof work a berry-crushing machine, a slice of everyday Trainer life rather than a gym battle. It ties Grass-type helpfulness to a farm chore, and it is Smart Play compatible once a Smart Brick is nearby.",
    "72151-1": "A large, posable Eevee display figure with a movable head, ears, legs, and tail, plus a hidden build surprise that nods to its many Evolutions. It is the partner Pokémon as a statue, built to look ready to leap or curl up on a shelf.",
    "72167-1": "Charizard and Jolteon face off in a championship-style battle, with a practice dummy and two Smart Bricks so the match can light up and make noise. Fire versus Electric is a classic type clash, staged here as the premium all-in-one fight of the wave.",
    "72156-1": "Squirtle rides along on a blue Trainer buggy that can fire stud projectiles, and a Smart Brick on the back can add engine sounds when you roll it. It is a Water-type out on the road, turning a starter Pokémon into a travel buddy.",
    "72165-1": "Umbreon and Garchomp square off as two big, detailed battle models in a championship pairing. Dark versus Dragon is an unusual headline match, built for collectors who want a shelf fight with plenty of presence.",
    "40887-1": "Ditto has taken Squirtle's shape for a movie-night scene, complete with a TV whose screen you can swap and a stand that hides a remote and a film. A Smart Tag (and space for a Smart Brick) lets the little copycat come alive, a playful nod to Ditto's transformations.",
    "77037-1": "Aloy and Varl hunt a Shell-Walker and a Sawtooth in tall reeds by a campfire, with bow and spear upgrades that switch between fire, chill, and shock. The Shell-Walker's claws, cargo pod, and shield, and the Sawtooth's opening jaws, turn a Horizon machine fight into a compact hunting ground.",
    "10375-1": "A posable Night Fury with a saddle, a repaired tail fin, and interchangeable fish or plasma-blast mouth pieces. It is Toothless as a display dragon, built so you can pose a glide, a roar, or a quiet landing.",
    "43249-1": "A big, brick-built Stitch with a turning head, movable ears, a Hawaiian shirt, a removable flower, and an ice-cream cone. It captures the mischievous alien in vacation mode, more character statue than chase scene.",
    "76282-1": "A posable Rocket with a spring shooter and blaster, and Baby Groot perched on his shoulder. It freezes the duo's odd-couple friendship from the Infinity Saga in a single display, ready for trouble.",
    "76249-1": "Groot is overtaken by a Venom symbiote, with posable limbs plus a long tongue, teeth, tentacles, and extra eyes. It is a what-if Marvel fusion: the gentle tree given a much sharper smile.",
    "76251-1": "A display-scale replica of Star-Lord's helmet from the films, meant to sit on a stand as a shelf piece. It is a character shorthand for the Infinity Saga's most reckless captain, without needing a whole ship around him.",
    "75318-1": "A large brick-built Grogu (The Child) nestled in his hovering pram, a quiet display of the Mandalorian's foundling. In the Star Wars story this is the moment the galaxy's most wanted kid looks harmless.",
    "75308-1": "A tall, detailed R2-D2 with the usual droid tricks (panels, a third leg, and plenty of hidden detail) built at display scale. It stands in for the saga's most loyal astromech, the little droid who has saved the plan more than once.",
    "75349-1": "A display helmet for Captain Rex, the veteran clone who fought through the Clone Wars and then chose his own path. It is a character portrait in armor, built for troopers who know the blue 501st markings on sight.",
    "75328-1": "A display replica of the Mandalorian's helmet, the T-visor that became the face of a later Star Wars era. On a shelf it reads as bounty hunter, father figure, and walking creed all at once.",
    "77093-1": "The final battle of Ocarina of Time, with Link, Zelda, and Ganondorf, a brick-built Ganon, and a Navi figure among the ruins of Ganon's Castle. A button raises Ganondorf from the rubble, Recovery Hearts hide in the debris, and the Master Sword, Megaton Hammer, and Hylian Shield are ready for one last fight.",
    "72046-1": "A near life-size Game Boy with pressable D-pad, A and B, Start and Select, plus contrast and volume dials and a cartridge slot. Interchangeable Super Mario Land and Link's Awakening Game Paks and lenticular screens sit on a display stand: a Nintendo relic built as Super Mario shelf decor, with no lights or sound.",
    "11373-1": "A tall replica of Sauron's helmet with a name-plaqued stand and a Sauron minifigure holding the One Ring. It is a dark centerpiece from The Lord of the Rings, built to loom rather than to play out a battle.",
    "7965-1": "The 2011 mid-size Millennium Falcon, the battered Corellian freighter with the right silhouette, interior rooms, and room for the usual suspects. It is the ship that made the Kessel Run famous, scaled for play and display between the smaller Falcons and the huge UCS ones.",
    "4940-1": "Axle pilots a walking mining machine whose legs step in an alternating gait and whose nose is a large chrome drill. On the stranded Rock Raiders planet this is a mid-size tunnel tool: compact enough for tight rock, stubborn enough to chew granite until the crystals show.",
    "4970-1": "The Chrome Crusher is a heavier Rock Raiders drill crawler built around a big chrome bit for breaking into crystal-rich rock. Where the Granite Grinder walks into a seam, this machine is the crew's harder-hitting miner, meant to keep energy crystals coming while the monsters close in.",
    "7770-1": "A small treasure-hunting sub and diver, the entry vehicle of the Aqua Raiders crew. It is built for scouting wrecks and lifting a first chest of gold before the bigger guardians notice.",
    "7771-1": "A lurking anglerfish with a glowing lure, ambushing divers who get too close to the treasure. In this theme the sea itself is the villain, and the angler is the first real warning that the gold is guarded.",
    "7772-1": "The Lobster Strike is the crew's heavy hitter against a giant lobster, a mid-size attack sub built to clamp onto a creature that does not want to let the wreck go. It is one of the clearest 'tool versus guardian' matches in the Aqua Raiders story.",
    "7773-1": "A tiger shark, one of the deep's fastest guardians, squared off against a Raiders attack craft. Speed and teeth versus armor is the whole scene: get the treasure without becoming the next wreck.",
    "7774-1": "A massive crab with crushing claws, among the largest creature builds in the wave. If the lobster is a heavy hitter, the Crab Crusher is the armored tank of the seafloor, a boss standing between the divers and the hoard.",
    "7775-1": "The Aqua Raiders seafloor base under assault, the closest thing the crew has to home turf, with a giant guardian crashing the compound. It is the invasion moment of the story: the treasure hunt has a headquarters, and the ocean has found it.",
    "7776-1": "A sunken sailing ship packed with gold, the prize that explains why anyone would dive this deep. Creature sets are the guards; the Shipwreck is the reason for the expedition.",
    "1728-1": "A compact Aquanaut crystal-crawler walker, the same kind of seabed scout as the later 6145 release. It is a small official miner, built to pick hydrolator crystals off the floor before the Aquasharks arrive.",
    "1749-1": "A tiny Aquanaut paravane scooter for a single diver on a short crystal run. In a theme about racing for hydrolators, this is the smallest official tool in the water.",
    "1806-1": "A pocket underwater scooter for an Aquanaut, barely more than a diver and a propulsion unit. It is a scout, not a fighter, meant to get a crystal and get back to the lab.",
    "1822-1": "Sea Claw 7 is an Aquanaut recovery vehicle with a grabbing claw for lifting crystals off the reef. It sits in the middle of the official lineup: bigger than a scooter, smaller than the explorer sub, and built for the same hydrolator race.",
    "6125-1": "Sea Sprint 9 is a quick Aquanaut sea scooter, a one-diver runner for darting between crystal sites. In the feud with the Aquasharks, speed is sometimes worth more than armor.",
    "6145-1": "The Crystal Crawler is an Aquanaut walking miner, low to the sand and built to pluck hydrolator crystals off the seabed. It is the official crew's methodical answer to shark-nosed raiders.",
    "6175-1": "The Crystal Explorer Sub is a mid-size Aquanaut submarine with arms for collecting hydrolator crystals on longer dives. It is the workhorse between the scooters and the Neptune lab, a mobile claim on the reef.",
    "6195-1": "The Neptune Discovery Lab is the Aquanauts' seafloor headquarters, a full undersea station for docking, research, and storing crystals. Every smaller sub in the wave is trying to get its cargo back here before the Aquasharks intercept it.",
    "6115-1": "A small Aquashark scout craft, shark-nosed and built for a quick crystal grab. It is the pirates' lookout, trailing official divers until a hydrolator is left unguarded.",
    "6135-1": "The Spy Shark is a stealthier Aquashark sub for watching Aquanaut routes and slipping in behind them. In a crystal war, the first side to know where the other is diving often wins.",
    "6155-1": "The Deep Sea Predator is a mid-size Aquashark attack sub with a shark-like profile, built to ram official claims and snatch hydrolator crystals. It is the everyday threat on the reef.",
    "6190-1": "Shark's Crystal Cave is the Aquasharks' hideout, a seafloor cave stuffed with stolen hydrolator crystals. If the Neptune Lab is where official divers store a find, this is where the pirates fence it.",
    "1095-1": "A tiny Hydronaut super sub, just enough craft to get a diver and a crystal home. It is a promotional-scale reminder that the official crystal mission continued into the late 1990s.",
    "6100-1": "The Aqua Dart is a small Hydronaut scooter for fast crystal runs. Like the earlier Aquanaut sprinters, it is about getting in and out before the Stingrays close the trench.",
    "6110-1": "A solo Hydronaut sub for one diver on a short patrol. It is a scout in the second Aquazone war, watching for mutant Stingray craft.",
    "6150-1": "The Crystal Detector is a Hydronaut search vehicle built to locate hydrolator crystals, the official answer to a darker, more territorial ocean. Finding the crystals is half the job; keeping them from the Stingrays is the other half.",
    "6159-1": "A second release of the Crystal Detector, the same Hydronaut search craft for pinpointing hydrolator deposits. It is a survey rig first, a fighter only if the Stingrays arrive mid-scan.",
    "6180-1": "The Hydro Search Sub is a large Hydronaut submarine for long-range crystal hunts and crew transport. It bridges the small detectors and the crystallization station, a proper ship for a longer war in the deep.",
    "6199-1": "The Hydro Crystallization Station is the Hydronauts' main seafloor base, where official divers process and store crystals under threat from the Stingrays. It is the Neptune Lab's successor: bigger stakes, a newer enemy, and a station that has to hold.",
    "6107-1": "A small Stingray recon craft, a mutant scout watching Hydronaut movements. In this half of Aquazone the ocean's own people are doing the surveying.",
    "6109-1": "The Sea Creeper is a compact Stingray attack vehicle, built to harass official divers at close range. It is an ambush in the weeds, not a flagship.",
    "6140-1": "A crab-like Stingray walker for clambering over the reef after hydrolator crystals. It makes the mutant faction feel at home on the seabed the Hydronauts are only visiting.",
    "6160-1": "The Sea Scorpion is a large Stingray assault craft, one of the mutant navy's heavier threats. Hydronaut crews meeting this in a trench are no longer on a survey: they are in a fight.",
    "6198-1": "The Stingray Stormer is the faction's command ship, the mutant counterpart to the Hydro Crystallization Station. If the Hydronauts have a lab, the Stingrays have a stormer, and the crystals are the reason both are there.",
    "2160-1": "The Crystal Scavenger is a small Aquaraiders salvage craft with an amber canopy, built to pick crystals out of wrecks and reefs. It introduces the third Aquazone faction as scavengers more than soldiers.",
    "2161-1": "The Aqua Dozer is a heavier Aquaraiders wrecking vehicle, a seafloor dozer for pushing into crystal sites the other factions already claimed. In 1997 it made the hydrolator race a three-sided scramble.",
    "2162-1": "The Hydro Reef Wrecker is the Aquaraiders flagship, a big amber-canopied wrecker for tearing into reefs after hydrolator crystals. It is the salvage crew at full size, less navy than demolition.",
    "3870-1": "A small promotional walker for Takeshi, just enough battle machine to put the team's heavy hitter on his feet. It is a pocket version of the 2007 Golden City fight, not a fortress-breaker.",
    "3871-1": "Ha-Ya-To's little promotional walker, a tiny taste of the pilot who usually takes the team's fastest machines. It is a magazine-scale mecha with the same mountain war behind it.",
    "3872-1": "A compact robot chopper piloted by a Devastator, the other side of the Sentai Mountain revolt in miniature. Even the promotional robots get a flying machine.",
    "3885-1": "Hikaru's little flyer, a promotional jet for the Stealth Hunter's usual pilot. It is a reminder that Exo-Force air support started small before the Golden City machines arrived.",
    "3885-2": "The boxed version of Hikaru's Little Flyer, the same compact promotional jet in a box instead of a polybag. Same pilot, same short-range flyer, just a different way it reached collectors.",
    "3886-1": "Ryo's small promotional walker, a mini mech for the team's technician and tank driver. It keeps his green-accented role in the war even at pocket size.",
    "3886-2": "The boxed release of Ryo's Walker, the same little promotional mech as 3886-1. Ryo still looks like the engineer who would rather fix a machine than pose with one.",
    "5965-1": "A tiny robot exo-suit for a Devastator, one of the earliest promotional looks at Meca One's infantry. It is the revolt in a handful of pieces.",
    "5966-1": "Hikaru's promotional glider, a 22-piece flyer from the first year of the war. Before Sky Guardian, this was how the team's flier took to the air in miniature.",
    "5967-1": "Takeshi Walker 2, a second promotional walker for the team's sword-and-cannon specialist. It is a tiny cousin of Grand Titan and Supernova, built for the same pilot.",
    "7700-1": "Stealth Hunter is Hikaru's first battle machine, a winged blue-and-orange mecha (unit A.01 Dragon Wing) built for speed and surprise attacks on robot lines. After Meca One's revolt, this is how Exo-Force's flyer opens the mountain war.",
    "7701-1": "Grand Titan is Takeshi's heavy ground mecha (L.01 Dragon Fang), a broad-shouldered walker meant to hold a gate or smash a drone line. If Hikaru dives in, Takeshi is the one who plants his feet and does not move.",
    "7702-1": "Thunder Fury is a red Devastator's robot battle machine, a clawed counterpart to the humans' early mechs. It is the revolt given legs: Meca One's army showing it can build fighting machines of its own.",
    "7703-1": "Fire Vulture is a blue Devastator's flying robot machine, a vulture-winged answer to human air support. On Sentai Mountain, the sky is no longer safe just because a human is in the cockpit.",
    "7704-1": "Sonic Phantom is a green Devastator's flying assault machine, a loud, fast raider used to hit human positions from above. It is the robot air wing at full noise.",
    "7705-1": "Gate Assault stages a robot push on a human gate, with Ha-Ya-To in a defender machine against Iron Drones. It is the mountain war at the door: hold the gate, or the southern half of Sentai is gone for good.",
    "7706-1": "The Mobile Defense Tank is Ryo's climbing, rolling defense machine (AT.02), a two-crew armored unit for holding ground on the mountain. The technician of Exo-Force built it to move a gun, not just a sword.",
    "7707-1": "Striking Venom is Meca One's huge robot assault walker, a multi-legged siege machine staffed with Iron Drones. It is the first year's boss: the revolt's flagship, aimed at breaking human lines on Sentai Mountain.",
    "7708-1": "Uplink is Ryo's compact communications and support mecha (AT.01 Tiger), a 69-piece field unit for keeping the team talking mid-battle. In a war of battle machines, a technician's uplink can matter as much as a cannon.",
    "7709-1": "Sentai Fortress is the human mountain stronghold, the largest Exo-Force build, with Sensei Keiken, all four pilots, and even Meca One in the fight. Bridges, towers, and a Silent Strike machine make this the home the robots are trying to overrun.",
    "7711-1": "Sentry is a small automated (or Iron Drone-staffed) robot guard post, a laser sentry for watching a pass or a bridge. It is the revolt's cheap insurance: not every threat needs a Devastator.",
    "7712-1": "Supernova is Takeshi's second battle machine (L.02 Flame King), a heavier, more aggressive mecha after Grand Titan. When the mountain fight needed more fire and less stance, this was his upgrade.",
    "7713-1": "Ha-Ya-To's White Lightning (A.03) duels Meca One's Bridge Walker on the span that still links the split mountain. It is the Tenchi Bridge fight in one box: the team's speed pilot versus the robot leader, over the most important crossing on Sentai.",
    "7714-1": "The limited Golden Guardian is Ha-Ya-To's gold-armored 2007 mecha (A.11), built for the fight around the Golden City. It marks the story's shift from the mountain fortress to a new prize worth a special paint job.",
    "7721-1": "Combat Crawler X2 is a robot assault crawler that Ryo has a reason to be near, a 2007 clash between the technician and a Devastator-led machine. It keeps the Golden City year from being only flying mechs and towers.",
    "8100-1": "Cyclone Defender is Ryo's compact 2007 defense mecha (AT.10), a smaller Tiger-series machine for the Golden City campaign. The team's engineer is still the one they want in a quick-response walker.",
    "8101-1": "Claw Crusher is a Devastator's smaller robot claw machine, a mid-year raider for harassing Golden City patrols. It is a reminder that Meca One's army still builds close-combat walkers, not just flying units.",
    "8102-1": "Blade Titan is Takeshi's Golden City mecha (L.10 Sharp Blade), a sword-armed walker for the fight around the new human stronghold. The team's heavy hitter brought a sharper edge once the war left the mountain.",
    "8103-1": "Sky Guardian is Hikaru's 2007 flying battle machine (A.10), built for speed over the Golden City. After Stealth Hunter, this is the flier's next-generation air support.",
    "8104-1": "Shadow Crawler is a green Devastator's robot walker, a stealthy crawler (and a grim passenger) for slipping into Golden City territory. Not every robot attack comes in through the front gate.",
    "8105-1": "Iron Condor is a red Devastator's flying robot machine, a condor-winged raider for the Golden City skies. Hikaru's Sky Guardian is the reason this one exists.",
    "8106-1": "Aero Booster is Ha-Ya-To's flying 2007 mecha (A.12), a booster-winged speed machine for the Golden City year. The team's fastest pilot finally gets a proper flyer of his own.",
    "8107-1": "Fight for the Golden Tower is the centerpiece of the 2007 story: Hitomi and a Devastator clash over the Golden City's tower, with a Sonic Raven machine in the mix. The new city has a prize, and both sides know it.",
    "8108-1": "Mobile Devastator is the robots' huge 2007 assault machine, packed with Meca One, Devastators, Iron Drones, and even a human counter-machine (Blazing Falcon) in the same fight. It is Striking Venom's successor: a rolling siege aimed at the Golden City.",
    "8111-1": "River Dragon is Ha-Ya-To's 2008 jungle mecha (W.20), a water-going speed machine for the campaign to rescue Sensei Keiken. The war has left the city for the rivers and trees.",
    "8112-1": "Battle Arachnoid is a Devastator's spider-like jungle machine, a red-spider walker for hunting humans in the trees. In the final year, the robot army starts looking more like the jungle it is invading.",
    "8113-1": "Assault Tiger is Takeshi's jungle battle machine (L.20), a tiger-inspired mecha for the 2008 rescue campaign. The heavy hitter went from blades and cannons to a beast that belongs in the deep forest.",
    "8114-1": "Chameleon Hunter is Hikaru's 2008 jungle mecha (L.21 Illusion Power), a camouflaged hunter built to disappear into the trees. After two years of open flyers, the team's flier learns to hide.",
    "8115-1": "Dark Panther is a jungle robot assault machine staffed by a Devastator and Iron Drones, a darkness-panther walker for ambushes in the canopy. It is the robot answer to the humans' animal-themed 2008 mechs.",
    "8117-1": "Storm Lasher is an Iron Drone's dragonfly-like flying machine, a jungle air raider from the last wave. Even without a named Devastator in the seat, Meca One's drones can still own a stretch of sky.",
    "8118-1": "The Hybrid Rescue Tank is Ryo's 2008 jungle transport (AT.20), built to pull Sensei Keiken out of danger with the technician and the sensei on board. It is the last year's hope: not just another fighter, but a machine meant to bring someone home.",
    "5616-1": "A pocket humanoid robot, a little helper (or hazard) on the Martian surface. In a crystal war, even a 24-piece bot can tip a skirmish.",
    "5617-1": "A tiny alien jet, just enough ETX craft to harass a mining patrol. It is a reminder that the other side of the crystal rush has air support too.",
    "5619-1": "Crystal Hawk is a small human flyer for scouting energy-crystal deposits from the air. Before the big dropships arrive, this is how the Mars Mission finds a vein.",
    "7644-1": "The MX-81 Hypersonic Operations Aircraft is a huge human airship for moving troops and firepower across Mars. When a crystal field turns into a battlefield, this is the high-altitude answer.",
    "7645-1": "The MT-61 Crystal Reaper is a human harvester built to gather energy crystals at scale. It is a mining machine that has to work under fire, the reason the expedition came to Mars in the first place.",
    "7646-1": "The ETX Alien Infiltrator is a mid-size alien assault craft for slipping into human mining zones. If the mothership is the invasion, this is the burglar.",
    "7647-1": "The MX-41 Switch Fighter is a transformable human fighter, able to change configuration as a patrol turns into a dogfight. Flexibility is the point: Mars does not give you one kind of battle.",
    "7648-1": "The MT-21 Mobile Mining Unit is a smaller human digger for pulling energy crystals out of the red soil. It is a work site on wheels, always one ambush away from needing backup.",
    "7649-1": "The MT-201 Ultra-Drill Walker is a big walking drill, a heavy human miner that can stomp to a new crystal vein and bore in. Among the 2008 machines, this is the one that looks like it could crack the planet open.",
    "7690-1": "The MB-01 Eagle Command Base is the human expedition's main crater headquarters, the flag and radio of the Mars Mission. Every dropship and drill in the wave is trying to get crystals, or casualties, back here.",
    "7691-1": "The ETX Alien Mothership Assault is a large alien command craft, the invasion's overhead threat to human bases and mines. If Eagle Base is home, this is the thing casting a shadow on it.",
    "7692-1": "The MX-71 Recon Dropship is a human transport for deploying troops and vehicles onto the Martian surface. Crystal fields are useless if you cannot put a crew on them.",
    "7693-1": "The ETX Alien Strike is a mid-size alien attack craft, a raiding party with glowing-eyed pilots aimed at human miners. It is a sharp, compact ambush: the crystal rush from the other side of the guns.",
    "7694-1": "The MT-31 Trike is a small human surface bike for scouting and quick crystal runs. Not every Mars Mission has to be a walker; sometimes the job is just to get there first.",
    "7695-1": "The MX-11 Astro Fighter is a compact human fighter for escorting mining units. It is short-range air cover, the little ship that keeps a drill from becoming a wreck.",
    "7697-1": "The MT-51 Claw-Tank Ambush is a human armored claw tank, built to grapple and fight when aliens hit a mining column. The name tells the story: this is what you deploy when the survey is already going wrong.",
    "7699-1": "The MT-101 Armored Drilling Unit is a heavy, shielded human drill for pulling energy crystals out of contested ground. Armor is the feature: this miner is expected to keep boring after the shooting starts.",
    "7728-1": "A human jet pack, the smallest way a Mars Mission trooper gets off the ground. In a fight over crystals, even a 25-piece pack can change who holds a crater rim.",
    "7729-1": "A tiny alien flyer, the ETX counterpart to a human jet pack. It is a quick sting from the other faction, not a mothership.",
    "2543-1": "A small UFO spacecraft, a pocket saucer-style craft from the alien fleet. Even the tiniest visitors arrive looking like they did not come from a human shipyard.",
    "2847-1": "A compact alien flyer, a 15-piece scout from the UFO wave. It is first contact at key-chain size.",
    "3012-1": "A small space hover for a UFO pilot, a hovering scout rather than a full saucer. The aliens do not need a mothership for every errand.",
    "4305-1": "Xcyber is a small UFO cyber-craft, a compact alien fighter from 1997. It has the same trans-green, mechanical-mind look as the bigger saucers, just in a tighter package.",
    "6800-1": "The Cyber Blaster is a tiny UFO assault craft, a one-alien gunship. In a theme about visitors in saucers, this is the sidearm of the fleet.",
    "6816-1": "A second number for the Cyber Blaster, the same small UFO gunship under a later or alternate set ID. Same role: a compact alien blaster, not a command saucer.",
    "6818-1": "The Cyborg Scout is a small UFO recon craft for a single alien pilot. It fits the theme's idea that these visitors are part flesh, part machine, even on a 36-piece scout.",
    "6829-1": "The Radon Rover is a UFO surface rover, proof the aliens are not only in the air. A visiting fleet that can roll as well as hover is much harder to shake.",
    "6836-1": "The V-Wing Fighter is a compact UFO interceptor with a V-shaped wing, a dogfighter from the saucer fleet. Not every alien arrives in a disc.",
    "6900-1": "The Cyber Saucer is a mid-size UFO flying saucer, one of the theme's most recognizable silhouettes, with a trans-green canopy and a cybernetic crew. This is first contact in the classic shape.",
    "6901-2": "A small UFO space plane, a winged alternative to the usual saucer. The visiting fleet has more than one way to enter the atmosphere.",
    "6902-1": "Another small UFO space plane, a close cousin of 6901-2. It keeps the alien air wing looking fast, not just round.",
    "6915-1": "The Warp Wing Fighter is a large, winged UFO fighter, a 236-piece flagship of the alien air wing rather than a saucer. If the Cyber Saucer is how they arrive, the Warp Wing is how they win a fight.",
    "6975-1": "The Alien Avenger is the UFO line's big command saucer, a 371-piece mothership-scale disc for the cybernetic crew. When collectors picture this theme, they are usually picturing this ship.",
    "6979-1": "The Interstellar Starfighter is a large UFO fighter, a long-range alien interceptor alongside the Avenger and Warp Wing. It is the fleet's sharp edge, built to look faster than any human rocket of the era.",
    "6999-1": "A second Cyber Saucer, closely related to 6900, the mid-size UFO disc with the same trans-green, cyber-minded look. It kept the classic saucer in circulation for the theme's first year.",
    "4117463-1": "A Toys R Us promotional bundle built around the Cyber Saucer for a store anniversary, more a special packaging of the UFO flagship than a new ship in the invasion.",
    "8630-1": "Mission 3: Gold Hunt sends Agents after a gold theft tied to Dr. Inferno's operation, a mid-size chase with room for gadgets and a getaway. In the 2008 mission list, this is the one about money funding a much worse plan.",
    "8631-1": "Mission 1: Jetpack Pursuit is the opening Agents assignment, a compact jetpack chase after Inferno's people. The agency starts in the air, not at a desk.",
    "8632-1": "Mission 2: Swamp Raid takes the Agents into wetland terrain after Inferno's henchmen, a murky set-piece between the jetpack opener and the later vehicle chases. Not every mission is a city street.",
    "8633-1": "Mission 4: Speedboat Rescue is a waterborne Agents mission, a speedboat extraction when Inferno's plot hits the coast. The numbered missions keep changing terrain so the doctor never gets comfortable.",
    "8634-1": "Mission 5: Turbocar Chase is a high-speed road pursuit, one of the 2008 line's signature spy-movie vehicles. When Inferno's crew runs, the Agents do not follow in a family car.",
    "8635-1": "Mission 6: Mobile Command Center is the Agents' rolling headquarters, a large truck packed with gadgets, holding cells, and a place to plan the next numbered mission. It is the agency on wheels, always closer to Inferno than a building would be.",
    "8636-1": "Mission 7: Deep Sea Quest sends the Agents underwater after another branch of Inferno's plan, a diving mission late in the 2008 sequence. The doctor does not hide in only one kind of lair.",
    "8637-1": "Mission 8: Volcano Base is the 2008 finale, a run at Dr. Inferno's crater headquarters. After seven missions of chases and rescues, the Agents finally knock on the villain's front door.",
    "8967-1": "Gold Tooth's Getaway is a compact 2009 pursuit of one of Inferno's henchmen, a short, punchy chase after the numbered missions wrapped. The gold-loving accomplice is still in play.",
    "8968-1": "River Heist is a 2009 riverside theft for Inferno's crew, and a chance for the Agents to interrupt it. The agency's second year still plays like a set-piece movie, just without mission numbers.",
    "8969-1": "4-Wheeling Pursuit is an off-road Agents chase, a 2009 all-terrain pursuit after Inferno's remaining operation. When the paved roads end, the agency keeps driving.",
    "8970-1": "Robo Attack brings a robotic threat into the 2009 Agents wave, a mechanized assault the agency has to stop. Inferno's plans were never going to stay at henchmen and getaway cars.",
    "8971-1": "The Aerial Defense Unit is a large 2009 Agents aircraft, air cover and intercept in one for the fight against Inferno. After a year of cars, boats, and a volcano, the agency takes the fight upstairs.",
    "70160-1": "Riverside Raid is a compact Ultra Agents opener, a small waterside clash in Astor City. The new agency's first problems start at street (and river) level, before AntiMatter takes center stage.",
    "70161-1": "Tremor Track Infiltration sends Ultra Agents after the villain Tremor, a mid-size infiltration of a shaking, ground-pounding threat. In Astor City, even the streets can be a weapon.",
    "70162-1": "Infearno Interception is a chase after the fire villain Infearno, a blaze-and-pursuit mission for Solomon Blaze's team. The name is a deliberate echo of an older doctor, but this is a new city's problem.",
    "70163-1": "Toxikita's Toxic Meltdown is a larger Ultra Agents mission against a villain who can melt and poison a crime scene. Containment matters as much as capture in Astor City.",
    "70164-1": "Hurricane Heist is a big 2014 vehicle mission, a storm-and-theft set piece for the Ultra Agents. The city's villains do not always wait for good weather.",
    "70165-1": "Ultra Agents Mission HQ is the team's 2014 headquarters, a thousand-piece base for briefing, holding, and launching missions across Astor City. Every smaller raid in the wave is trying to bring a villain back here.",
    "70166-1": "Spyclops Infiltration is a compact 2015 mission against the multi-eyed spy villain Spyclops. In a city already full of gadgets, the agents have to catch someone who is better at watching them.",
    "70167-1": "Invizable Gold Getaway is a mid-size chase after a thief who can vanish mid-heist. Gold is the bait; invisibility is the problem the Ultra Agents have to solve.",
    "70168-1": "Drillex Diamond Job pits the team against a villain who drills straight into a vault, a diamond heist that does not bother with doors. Astor City's banks were not designed for this.",
    "70169-1": "Agent Stealth Patrol is a 2015 Ultra Agents stealth vehicle, a quieter patrol machine for stalking villains without a siren. After a year of loud chases, the team learns to sneak.",
    "70170-1": "UltraCopter vs. AntiMatter is a mid-air showdown with the year's big threat, the team's helicopter against a villain who can warp more than a getaway. This is the fight the HQ was built for.",
    "70171-1": "Ultrasonic Showdown is a compact 2015 clash built around sonic gadgets, a smaller duel in the AntiMatter year. Not every mission needs a hideout; some just need a frequency.",
    "70172-1": "AntiMatter's Portal Hideout is the villain's lair, a gateway-filled hideout the Ultra Agents have to breach. If Mission HQ is the team's home, this is the door they should not leave open.",
    "70173-1": "Ultra Agents Ocean HQ is the 2015 seaborne headquarters, an even larger base for the fight against AntiMatter. When the city itself was no longer a safe place to brief, the agency put its headquarters on the water."
  }
};
