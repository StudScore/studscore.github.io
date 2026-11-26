// parts.js: the "Parts" checklist inside each set and minifig popup (StudScore phase 2).
// Tick the parts you have; whatever is not ticked (or short, like 3/4) is the missing list.
//
// Data: GET {worker}/parts/{id} returns Rebrickable's inventory (free bulk downloads, preloaded in the Worker's D1; no keys
//   needed): plain parts plus the sticker sheet. A collector who saved BrickLink keys also gets BrickLink's inventory via
//   POST /bl/parts (their own keys; the Worker passes it back and stores nothing). That copy is kept only in this browser
//   (IndexedDB 'studscore-parts', refreshed after 180 days) and used only while keys are saved. BrickLink lists stickered
//   parts as "Counterparts" next to the plain part and the sticker sheet; each one is PAIRED with its plain part (one
//   line, counted once). Sticker sheets get their own line but are not counted in piece totals.
// Storage: localStorage 'studParts' {sets:{id:REC}, figs:{id:REC}}
//   REC = {b:0|1 (baseline: everything unticked / ticked), h:{lineKey:have}, sa:{lineKey:1 (sticker applied)},
//          src:'rb'|'bl', s:{m:missingPieces, l:missingLots, k:sheetsMissing, n:totalPieces, L:lots}, t}
//   Line keys: "part|blColor" (plain), "part|blColor|stickeredPart" (paired), "stk|sheetNo" (sticker sheet).
//   No record yet: Sealed and New count as all ticked, anything else as "not checked yet" (no Missing badge).
(function(){
'use strict';
const LS='studParts';
const ld=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDemo=()=>!!ld('studDemo',false);
const endpoint=()=>String((typeof window.STUD_BL_ENDPOINT==='string')?window.STUD_BL_ENDPOINT:'https://studscore-community.studscore.workers.dev').replace(/\/+$/,'');
const KEY_RE=/^[A-Za-z0-9]{8,64}$/;
function blKeys(){const k=ld('studBrickLinkKeys',null);return k&&['consumer_key','consumer_secret','token','token_secret'].every(f=>typeof k[f]==='string'&&KEY_RE.test(k[f]))?k:null;}

// Rebrickable color id -> [name, rgb, BrickLink color id]; BrickLink color id -> [name, rgb]. From rebrickable.com/colors.
const RBC={"1126":["HO Metallic Dark Gray","5e5e5e",null],"1134":["HO Titanium","616161",null],"1015":["Modulex Light Gray","9C9C9C",125],"1041":["Modulex Foil Light Gray","9C9C9C",211],"1000":["Glow in Dark White","D9D9D9",159],"1013":["Modulex White","F4F4F4",123],"1055":["Opal Trans-Clear","FCFCFC",228],"117":["Glitter Trans-Clear","FFFFFF",101],"15":["White","FFFFFF",1],"1143":["Glitter Milky White","FFFFFF",null],"1039":["Modulex Clear","FFFFFF",149],"133":["Speckle Black-Gold","05131D",151],"75":["Speckle Black-Copper","05131D",116],"132":["Speckle Black-Silver","05131D",111],"0":["Black","05131D",11],"1017":["Modulex Tile Gray","6B5A5A",127],"64":["Chrome Black","1B2A34",122],"1103":["Pearl Titanium","3E3C39",77],"148":["Pearl Dark Gray","575857",77],"1016":["Modulex Charcoal Gray","595D60",126],"1040":["Modulex Foil Dark Gray","595D60",210],"40":["Trans-Brown","635F52",13],"1095":["Trans-Black","635F52",251],"32":["Trans-Black IR Lens","635F52",null],"72":["Dark Bluish Gray","6C6E68",85],"8":["Dark Gray","6D6E5C",10],"1130":["HO Rose","d06262",null],"179":["Flat Silver","898788",95],"7":["Light Gray","9BA19D",9],"135":["Pearl Light Gray","9CA3A8",66],"71":["Light Bluish Gray","A0A5A9",86],"150":["Pearl Very Light Gray","ABADAC",119],"80":["Metallic Silver","A5A9B4",67],"1135":["Metal","A5ADB4",null],"21":["Glow In Dark Opaque","D4D5C9",46],"383":["Chrome Silver","E0E0E0",22],"151":["Very Light Bluish Gray","E6E3E0",99],"503":["Very Light Gray","E6E3DA",49],"1124":["HO Medium Red","c01111",null],"183":["Pearl White","F2F3F2",83],"47":["Trans-Clear","FCFCFC",12],"79":["Milky White","FFFFFF",60],"1019":["Modulex Tile Brown","330000",131],"1047":["Modulex Foil Red","8B0000",217],"335":["Sand Red","D67572",58],"1023":["Modulex Red","B52C20",129],"216":["Rust","B31004",27],"1144":["Chrome Red","CE3021",null],"4":["Red","C91A09",5],"36":["Trans-Red","C91A09",17],"1083":["Two-tone Copper","945148",237],"12":["Salmon","F2705E",25],"1010":["Vintage Red","CA1F08",null],"1024":["Modulex Pink Red","F45C40",130],"1068":["Bright Reddish Orange","EE5434",231],"1081":["Rust Orange","872B17",null],"1140":["Neon Orange","EC4612",165],"1138":["Umber Brown","5E3F33",168],"1072":["Pearl Brown","57392C",255],"1092":["Metallic Copper","764D3B",250],"1067":["Dark Nougat","AD6140",225],"1119":["HO Light Brown","965336",null],"86":["Light Brown","7C503A",91],"1136":["Reddish Orange","CA4C0B",167],"70":["Reddish Brown","582A12",88],"134":["Copper","AE7A59",84],"6":["Brown","583927",8],"1056":["Opal Trans-Brown","583927",229],"1137":["Sienna Brown","915C3C",169],"1025":["Modulex Orange","F47B30",135],"92":["Nougat","D09168",28],"1084":["Two-tone Gold","AB673A",238],"1088":["Medium Brown","755945",240],"450":["Fabuland Brown","B67B50",106],"84":["Medium Nougat","AA7D55",150],"1064":["Fabuland Red","FF8014",null],"57":["Trans-Neon Orange","FF800D",18],"1085":["Two-tone Silver","737271",239],"178":["Flat Dark Gold","B48455",81],"1049":["Modulex Foil Orange","F7AD63",219],"1026":["Modulex Light Orange","F7AD63",136],"25":["Orange","FE8A18",4],"484":["Dark Orange","A95500",68],"1004":["Trans-Flame Yellowish Orange","FCB76D",164],"78":["Light Nougat","F6D7B3",90],"1089":["Warm Tan","CCA373",241],"1012":["Fabuland Orange","EF9121",160],"182":["Trans-Orange","F08F1C",98],"1052":["Glitter Trans-Orange","F08F1C",222],"1021":["Modulex Brown","907450",132],"1116":["HO Earth Orange","bb771b",null],"60":["Chrome Antique Brass","645A4C",57],"68":["Very Light Orange","F3CF9B",96],"1065":["Reddish Gold","AC8247",235],"125":["Light Orange","F9BA61",32],"1145":["Ochre Yellow","DD9E47",173],"366":["Earth Orange","FA9C1C",29],"1063":["Pearl Copper","B46A00",249],"1080":["Light Tan","F3C988",null],"1091":["Warm Yellowish Orange","FFCB78",172],"1066":["Curry","DD982E",161],"308":["Dark Brown","352100",120],"1022":["Modulex Buff","DEC69C",133],"462":["Medium Orange","FFA70B",31],"142":["Pearl Light Gold","DCBC81",61],"297":["Pearl Gold","AA7F2E",115],"28":["Dark Tan","958A73",69],"19":["Tan","E4CD9E",2],"1133":["HO Tan","E4CD9E",null],"191":["Bright Light Orange","F8BB3D",110],"1020":["Modulex Terracotta","5C5030",134],"82":["Metallic Gold","DBAC34",65],"1028":["Modulex Ochre Yellow","FED557",138],"1048":["Modulex Foil Yellow","FED557",218],"1120":["HO Light Gold","cdc298",null],"1117":["HO Gold","b4a774",null],"18":["Light Yellow","FBE696",33],"1027":["Modulex Light Yellow","FFE371",137],"14":["Yellow","F2CD37",3],"46":["Trans-Yellow","F5CD2F",19],"1139":["Opal Trans-Yellow","F5CD2F",170],"1100":["Clikits Yellow","FFCF0B",null],"1011":["Vintage Yellow","F3C305",null],"54":["Trans-Neon Yellow","DAB000",121],"1005":["Trans-Fire Yellow","FBE890",null],"334":["Chrome Gold","BBA53D",21],"1121":["HO Light Tan","f9f1c7",null],"226":["Bright Light Yellow","FFF03A",103],"1062":["Vibrant Yellow","EBD800",236],"42":["Trans-Neon Green","F8F184",16],"1076":["Duplo Lime","FFF230",171],"1142":["Dark Olive Green","5d5c36",242],"1129":["HO Olive Green","9B9A5A",null],"326":["Olive Green","9B9A5A",155],"1110":["HO Dark Gray","6D6E5C",null],"1112":["HO Dark Lime","b2b955",null],"1029":["Modulex Lemon","BDC618",139],"1122":["HO Light Yellow","f5fab7",null],"115":["Medium Lime","C7D23C",76],"1096":["Glitter Trans-Bright Green","D9E4A7",null],"120":["Light Lime","D9E4A7",35],"35":["Trans-Bright Green","D9E4A7",108],"158":["Yellowish Green","DFEEA5",158],"27":["Lime","BBE90B",34],"1141":["Neon Green","D2FC43",166],"1002":["Glitter Trans-Neon Green","C0F500",163],"81":["Metallic Green","899B5F",70],"1086":["Pearl Lime","6A7944",null],"1057":["Trans-Light Bright Green","C9E788",226],"1031":["Modulex Olive Green","7C9051",140],"76":["Speckle DBGray-Silver","6C6E68",117],"1127":["HO Metallic Green","879867",null],"294":["Glow In Dark Trans","BDC6AD",118],"1043":["Modulex Foil Light Green","7DB538",213],"1030":["Modulex Pastel Green","7DB538",141],"17":["Light Green","C2DAB8",38],"10":["Bright Green","4B9F4A",36],"1114":["HO Dark Sand Green","627a62",null],"1077":["Fabuland Lime","78FC78",248],"1009":["Vintage Green","1E601E",null],"1042":["Modulex Foil Dark Green","006400",212],"1098":["Glitter Trans-Green","84B68D",null],"34":["Trans-Green","84B68D",20],"1060":["Opal Trans-Bright Green","84B68D",233],"1079":["Duplo Light Green","60BA76",null],"1058":["Trans-Light Green","94E5AB",221],"2":["Green","237841",6],"1078":["Duplo Medium Green","468A5F",null],"378":["Sand Green","A0BCAC",48],"1132":["HO Sand Green","A0BCAC",null],"1071":["Pearl Green","008E3C",253],"74":["Medium Green","73DCA1",37],"62":["Chrome Green","3CB371",64],"1111":["HO Dark Green","184632",null],"288":["Dark Green","184632",80],"1118":["HO Light Aqua","a3d1c0",null],"1108":["HO Dark Aqua","a7dccf",null],"1090":["Duplo Turquoise","3FB69E",null],"1104":["HO Aqua","B3D7D1",null],"118":["Aqua","B3D7D1",41],"323":["Light Aqua","ADC3C0",152],"1032":["Modulex Aqua Green","27867E",142],"41":["Trans-Light Blue","AEEFEC",15],"1115":["HO Dark Turquoise","10929d",null],"3":["Dark Turquoise","008F9B",39],"1003":["Glitter Trans-Light Blue","68BCC5",162],"1053":["Opal Trans-Light Blue","68BCC5",223],"11":["Light Turquoise","55A5AF",40],"322":["Medium Azure","36AEBF",156],"1051":["Pastel Blue","5AC4DA",72],"1008":["Vintage Blue","039CBD",null],"1074":["Duplo Blue","009ECE",247],"1075":["Duplo Medium Blue","3E95B6",null],"1106":["HO Blue-gray","354e5a",null],"232":["Sky Blue","7DBFDD",87],"1033":["Modulex Teal Blue","467083",146],"1107":["HO Cyan","5b98b3",null],"1045":["Modulex Foil Light Blue","68AECE",215],"1036":["Modulex Pastel Blue","68AECE",145],"1125":["HO Metallic Blue","0d4763",null],"1105":["HO Azure","1591cb",null],"321":["Dark Azure","078BC9",153],"1128":["HO Metallic Sand Blue","5f7d8c",null],"313":["Maersk Blue","3592C3",72],"43":["Trans-Very Lt Blue","C1DFF0",113],"9":["Light Blue","B4D2E3",62],"1070":["Pearl Blue","0059A3",254],"61":["Chrome Blue","6C96BF",52],"1034":["Modulex Tile Blue","0057A6",143],"1044":["Modulex Foil Dark Blue","0057A6",214],"212":["Bright Light Blue","9FC3E9",105],"1131":["HO Sand Blue","6e8aa6",null],"1035":["Modulex Medium Blue","61AFFF",144],"143":["Trans-Medium Blue","CFE2F7",74],"1006":["Trans-Light Royal Blue","B4D4F7",null],"272":["Dark Blue","0A3463",63],"1109":["HO Dark Blue","0A3463",null],"73":["Medium Blue","5A93DB",42],"1":["Blue","0055BF",7],"1123":["HO Medium Blue","7396c8",null],"137":["Pearl Sand Blue","7988A1",78],"379":["Sand Blue","6074A1",55],"1073":["Pearl Black","0A1327",244],"1014":["Modulex Light Bluish Gray","AfB5C7",124],"110":["Violet","4354A3",43],"1061":["Opal Trans-Dark Blue","0020A0",232],"33":["Trans-Dark Blue","0020A0",14],"89":["Royal Blue","4C61DB",97],"112":["Medium Bluish Violet","6874CA",73],"23":["Dark Blue-Violet","2032B0",109],"1093":["Light Lilac","9195CA",246],"1147":["Blue Violet","A3A9FF",174],"20":["Light Violet","C9CAE2",44],"129":["Glitter Trans-Purple","A5A5CB",102],"52":["Trans-Purple","A5A5CB",51],"1001":["Medium Violet","9391E4",245],"85":["Dark Purple","3F3691",89],"1018":["Modulex Black","4D4C52",128],"1097":["Glitter Trans-Medium Purple","8D73B3",null],"1094":["Trans-Medium Purple","8D73B3",234],"1101":["Duplo Dark Purple","5F27AA",null],"31":["Lavender","E1D5ED",154],"1046":["Modulex Foil Violet","4B0082",216],"1059":["Opal Trans-Purple","8320B7",230],"30":["Medium Lavender","AC78BA",157],"236":["Trans-Light Purple","96709F",114],"1007":["Reddish Lilac","8E5597",227],"373":["Sand Purple","845E84",54],"22":["Purple","81007B",24],"63":["Chrome Pink","AA4D8E",82],"26":["Magenta","923978",71],"1054":["Opal Trans-Dark Pink","CE1D9B",224],"5":["Dark Pink","C870A0",47],"29":["Bright Pink","E4ADC8",104],"230":["Trans-Pink","E4ADC8",107],"1099":["Glitter Trans-Pink","E4ADC8",null],"69":["Light Purple","CD6298",93],"1082":["Clikits Pink","FE78B0",null],"114":["Glitter Trans-Dark Pink","DF6695",100],"45":["Trans-Dark Pink","DF6695",50],"351":["Medium Dark Pink","F785B1",94],"1038":["Modulex Pink","F785B1",148],"1050":["Coral","FF698F",220],"1102":["Trans-Neon Red","FF0040",null],"13":["Pink","FC97AC",23],"1069":["Pearl Red","D60026",252],"1087":["Duplo Pink","FF879C",null],"1146":["Warm Pink","F6B7BF",175],"1037":["Modulex Violet","BD7D85",147],"77":["Light Pink","FECCCF",56],"100":["Light Salmon","FEBABD",26],"1113":["HO Dark Red","631314",null],"320":["Dark Red","720E0F",59]};
const BLC={"125":["Mx Light Gray","9C9C9C"],"211":["Mx Foil Light Gray","9C9C9C"],"159":["Glow in Dark White","D9D9D9"],"123":["Mx White","F4F4F4"],"228":["Satin White","FCFCFC"],"101":["Glitter Trans-Clear","FFFFFF"],"1":["White","FFFFFF"],"149":["Mx Clear","FFFFFF"],"151":["Speckle Black-Gold","05131D"],"116":["Speckle Black-Copper","05131D"],"111":["Speckle Black-Silver","05131D"],"11":["Black","05131D"],"127":["Mx Tile Gray","6B5A5A"],"122":["Chrome Black","1B2A34"],"77":["Pearl Dark Gray","3E3C39"],"126":["Mx Charcoal Gray","595D60"],"210":["Mx Foil Dark Gray","595D60"],"13":["Trans-Black","635F52"],"251":["Trans-Black (2023)","635F52"],"85":["Dark Bluish Gray","6C6E68"],"10":["Dark Gray","6D6E5C"],"95":["Flat Silver","898788"],"9":["Light Gray","9BA19D"],"66":["Pearl Light Gray","9CA3A8"],"86":["Light Bluish Gray","A0A5A9"],"119":["Pearl Very Light Gray","ABADAC"],"67":["Metallic Silver","A5A9B4"],"46":["Glow In Dark Opaque","D4D5C9"],"22":["Chrome Silver","E0E0E0"],"99":["Very Light Bluish Gray","E6E3E0"],"49":["Very Light Gray","E6E3DA"],"83":["Pearl White","F2F3F2"],"12":["Trans-Clear","FCFCFC"],"60":["Milky White","FFFFFF"],"131":["Mx Tile Brown","330000"],"217":["Mx Foil Red","8B0000"],"58":["Sand Red","D67572"],"129":["Mx Red","B52C20"],"27":["Rust","B31004"],"5":["Red","C91A09"],"17":["Trans-Red","C91A09"],"237":["Bionicle Copper","945148"],"25":["Salmon","F2705E"],"130":["Mx Pink Red","F45C40"],"231":["Dark Salmon","EE5434"],"165":["Neon Orange","EC4612"],"168":["Umber","5E3F33"],"255":["Pearl Brown","57392C"],"250":["Metallic Copper","764D3B"],"225":["Dark Nougat","AD6140"],"91":["Light Brown","7C503A"],"167":["Reddish Orange","CA4C0B"],"88":["Reddish Brown","582A12"],"84":["Copper","AE7A59"],"8":["Brown","583927"],"229":["Satin Trans-Black","583927"],"169":["Sienna","915C3C"],"135":["Mx Orange","F47B30"],"28":["Nougat","D09168"],"238":["Bionicle Gold","AB673A"],"240":["Medium Brown","755945"],"106":["Fabuland Brown","B67B50"],"150":["Medium Nougat","AA7D55"],"18":["Trans-Neon Orange","FF800D"],"239":["Bionicle Silver","737271"],"81":["Flat Dark Gold","B48455"],"219":["Mx Foil Orange","F7AD63"],"136":["Mx Light Orange","F7AD63"],"4":["Orange","FE8A18"],"68":["Dark Orange","A95500"],"164":["Trans Light Orange","FCB76D"],"90":["Light Nougat","F6D7B3"],"241":["Medium Tan","CCA373"],"160":["Fabuland Orange","EF9121"],"98":["Trans-Orange","F08F1C"],"222":["Glitter Trans-Orange","F08F1C"],"132":["Mx Brown","907450"],"57":["Chrome Antique Brass","645A4C"],"96":["Very Light Orange","F3CF9B"],"235":["Reddish Gold","AC8247"],"32":["Light Orange","F9BA61"],"173":["Ochre Yellow","DD9E47"],"29":["Earth Orange","FA9C1C"],"249":["Reddish Copper","B46A00"],"172":["Warm Yellowish Orange","FFCB78"],"161":["Dark Yellow","DD982E"],"120":["Dark Brown","352100"],"133":["Mx Buff","DEC69C"],"31":["Medium Orange","FFA70B"],"61":["Pearl Light Gold","DCBC81"],"115":["Pearl Gold","AA7F2E"],"69":["Dark Tan","958A73"],"2":["Tan","E4CD9E"],"110":["Bright Light Orange","F8BB3D"],"134":["Mx Terracotta","5C5030"],"65":["Metallic Gold","DBAC34"],"138":["Mx Ochre Yellow","FED557"],"218":["Mx Foil Yellow","FED557"],"33":["Light Yellow","FBE696"],"137":["Mx Light Yellow","FFE371"],"3":["Yellow","F2CD37"],"19":["Trans-Yellow","F5CD2F"],"170":["Satin Trans-Yellow","F5CD2F"],"121":["Trans-Neon Yellow","DAB000"],"21":["Chrome Gold","BBA53D"],"103":["Bright Light Yellow","FFF03A"],"236":["Neon Yellow","EBD800"],"16":["Trans-Neon Green","F8F184"],"171":["Lemon","FFF230"],"242":["Dark Olive Green","5d5c36"],"155":["Olive Green","9B9A5A"],"139":["Mx Lemon","BDC618"],"76":["Medium Lime","C7D23C"],"35":["Light Lime","D9E4A7"],"108":["Trans-Bright Green","D9E4A7"],"158":["Yellowish Green","DFEEA5"],"34":["Lime","BBE90B"],"166":["Neon Green","D2FC43"],"163":["Glitter Trans-Neon Green","C0F500"],"70":["Metallic Green","899B5F"],"226":["Trans-Light Bright Green","C9E788"],"140":["Mx Olive Green","7C9051"],"117":["Speckle DBGray-Silver","6C6E68"],"118":["Glow In Dark Trans","BDC6AD"],"213":["Mx Foil Light Green","7DB538"],"141":["Mx Pastel Green","7DB538"],"38":["Light Green","C2DAB8"],"36":["Bright Green","4B9F4A"],"248":["Fabuland Lime","78FC78"],"212":["Mx Foil Dark Green","006400"],"20":["Trans-Green","84B68D"],"233":["Satin Trans-Bright Green","84B68D"],"221":["Trans-Light Green","94E5AB"],"6":["Green","237841"],"48":["Sand Green","A0BCAC"],"253":["Pearl Green","008E3C"],"37":["Medium Green","73DCA1"],"64":["Chrome Green","3CB371"],"80":["Dark Green","184632"],"41":["Aqua","B3D7D1"],"152":["Light Aqua","ADC3C0"],"142":["Mx Aqua Green","27867E"],"15":["Trans-Light Blue","AEEFEC"],"39":["Dark Turquoise","008F9B"],"162":["Glitter Trans-Light Blue","68BCC5"],"223":["Satin Trans-Light Blue","68BCC5"],"40":["Light Turquoise","55A5AF"],"156":["Medium Azure","36AEBF"],"72":["Maersk Blue","5AC4DA"],"247":["Little Robots Blue","009ECE"],"87":["Sky Blue","7DBFDD"],"146":["Mx Teal Blue","467083"],"215":["Mx Foil Light Blue","68AECE"],"145":["Mx Pastel Blue","68AECE"],"153":["Dark Azure","078BC9"],"113":["Trans-Aqua","C1DFF0"],"62":["Light Blue","B4D2E3"],"254":["Pearl Blue","0059A3"],"52":["Chrome Blue","6C96BF"],"143":["Mx Tile Blue","0057A6"],"214":["Mx Foil Dark Blue","0057A6"],"105":["Bright Light Blue","9FC3E9"],"144":["Mx Medium Blue","61AFFF"],"74":["Trans-Medium Blue","CFE2F7"],"63":["Dark Blue","0A3463"],"42":["Medium Blue","5A93DB"],"7":["Blue","0055BF"],"78":["Pearl Sand Blue","7988A1"],"55":["Sand Blue","6074A1"],"244":["Pearl Black","0A1327"],"124":["Mx Light Bluish Gray","AfB5C7"],"43":["Violet","4354A3"],"232":["Satin Trans-Dark Blue","0020A0"],"14":["Trans-Dark Blue","0020A0"],"97":["Royal Blue","4C61DB"],"73":["Medium Violet","6874CA"],"109":["Dark Blue-Violet","2032B0"],"246":["Light Lilac","9195CA"],"174":["Blue Violet","A3A9FF"],"44":["Light Violet","C9CAE2"],"102":["Glitter Trans-Purple","A5A5CB"],"51":["Trans-Purple","A5A5CB"],"245":["Lilac","9391E4"],"89":["Dark Purple","3F3691"],"128":["Mx Black","4D4C52"],"234":["Trans-Medium Purple","8D73B3"],"154":["Lavender","E1D5ED"],"216":["Mx Foil Violet","4B0082"],"230":["Satin Trans-Purple","8320B7"],"157":["Medium Lavender","AC78BA"],"114":["Trans-Light Purple","96709F"],"227":["Clikits Lavender","8E5597"],"54":["Sand Purple","845E84"],"24":["Purple","81007B"],"82":["Chrome Pink","AA4D8E"],"71":["Magenta","923978"],"224":["Satin Trans-Dark Pink","CE1D9B"],"47":["Dark Pink","C870A0"],"104":["Bright Pink","E4ADC8"],"107":["Trans-Pink","E4ADC8"],"93":["Light Purple","CD6298"],"100":["Glitter Trans-Dark Pink","DF6695"],"50":["Trans-Dark Pink","DF6695"],"94":["Medium Dark Pink","F785B1"],"148":["Mx Pink","F785B1"],"220":["Coral","FF698F"],"23":["Pink","FC97AC"],"252":["Pearl Red","D60026"],"175":["Warm Pink","F6B7BF"],"147":["Mx Violet","BD7D85"],"56":["Rose Pink","FECCCF"],"26":["Light Salmon","FEBABD"],"59":["Dark Red","720E0F"],"0":["(Not Applicable)","D9D9D9"]};
// Rebrickable part categories
const CATS={"1":"Baseplates","3":"Bricks Sloped","4":"Duplo, Quatro and Primo","5":"Bricks Special","6":"Bricks Wedged","7":"Containers","8":"Technic Bricks","9":"Plates Special","11":"Bricks","12":"Technic Connectors","13":"Minifigs","14":"Plates","15":"Tiles Special","16":"Windows and Doors","17":"Gear Parts","18":"Hinges, Arms and Turntables","19":"Tiles","20":"Bricks Round and Cones","21":"Plates Round Curved and Dishes","22":"Pneumatics","23":"Panels","24":"Other","25":"Technic Steering, Suspension and Engine","26":"Technic Special","27":"Minifig Accessories","28":"Animals / Creatures","29":"Wheels and Tyres","30":"Tubes and Hoses","31":"String, Bands and Reels","32":"Bars, Ladders and Fences","33":"Rock","34":"Supports, Girders and Cranes","35":"Transportation - Sea and Air","36":"Transportation - Land","37":"Bricks Curved","38":"Flags, Banners and Signs","39":"Magnets and Holders","40":"Technic Panels","41":"Large Buildable Figures","42":"Belville, Scala and Fabuland","43":"Znap","44":"Mechanical","45":"Electronics","46":"Technic Axles","47":"Windscreens and Fuselage","48":"Clikits","49":"Plates Wedged","50":"HO Scale","51":"Technic Beams","52":"Technic Gears","53":"Technic Pins","54":"Technic Bushes","55":"Technic Beams Special","56":"Tools","57":"Non-Buildable Figures (Duplo, Fabuland, etc)","58":"Stickers","59":"Minifig Heads","60":"Minifig Upper Body","61":"Minifig Lower Body","62":"Minidoll Heads","63":"Minidoll Upper Body","64":"Minidoll Lower Body","65":"Minifig Headwear","66":"Modulex","67":"Tiles Round and Curved","68":"Projectiles / Launchers","69":"Energy Effects","70":"Minifig Hipwear","71":"Minifig Neckwear","72":"Minifig Headwear Accessories","73":"Minifig Shields, Weapons, & Tools","74":"Animal / Creature Accessories","75":"Animal / Creature Body Parts","76":"Plants & Trees","77":"Non-System Parts","78":"Pen & Watch"};

let ST=(()=>{const s=ld(LS,null)||{};return {sets:s.sets||{},figs:s.figs||{}};})();
let saveT=0,dirty=false;const save=()=>{dirty=true;clearTimeout(saveT);saveT=setTimeout(flush,250);};
const flush=()=>{clearTimeout(saveT);if(!dirty)return;dirty=false;sv(LS,ST);};
window.addEventListener('pagehide',flush);
const bag=kind=>kind==='set'?ST.sets:ST.figs;
const rec=(kind,id)=>bag(kind)[id]||null;
const newCond=c=>/^(sealed|new)/i.test(String(c||''));

// ---------- loading ----------
const MEM=new Map();
function ids(kind,id){
  if(kind==='set')return {rb:id,bl:id,t:'SET'};
  let rb=/^fig-/i.test(id)?id:null,bl=/^fig-/i.test(id)?null:id;
  try{const r=typeof figIds==='function'?figIds(id):null;if(r){rb=rb||r.fig;bl=bl||r.bl;}}catch(e){}
  return {rb:rb||bl,bl,t:'MINIFIG'};
}
// This collector's own BrickLink copies: IndexedDB (big lists don't fit well in localStorage), memory fallback.
const BL_DAYS=180,BLMEM=new Map();let dbP=null;
function db(){if(dbP)return dbP;dbP=new Promise(res=>{try{const r=indexedDB.open('studscore-parts',1);r.onupgradeneeded=()=>r.result.createObjectStore('bl');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null);}catch(e){res(null);}});return dbP;}
async function blGetLocal(key){if(BLMEM.has(key))return BLMEM.get(key);const d=await db();if(!d)return null;
  return new Promise(res=>{try{const q=d.transaction('bl','readonly').objectStore('bl').get(key);q.onsuccess=()=>{const v=q.result||null;if(v)BLMEM.set(key,v);res(v);};q.onerror=()=>res(null);}catch(e){res(null);}});}
async function blPutLocal(key,v){BLMEM.set(key,v);const d=await db();if(!d)return;try{d.transaction('bl','readwrite').objectStore('bl').put(v,key);}catch(e){}}
async function blClearLocal(){BLMEM.clear();const d=await db();if(!d)return;try{d.transaction('bl','readwrite').objectStore('bl').clear();}catch(e){}}
const fresh=v=>v&&v.e&&v.t&&(Date.now()-Date.parse(v.t))<BL_DAYS*864e5;
async function load(kind,id,onUpdate){
  const I=ids(kind,id),mk=kind+':'+id;
  if(MEM.has(mk)){const D=MEM.get(mk);if(!blKeys())D.bl=null;return D;}
  const ep=endpoint();if(!ep)throw new Error('Parts lists are not available right now.');
  const k=blKeys(),bk=I.t+':'+I.bl;
  if(!k)blClearLocal(); // keys forgotten on this device: drop the BrickLink copies fetched with them
  const [r,loc]=await Promise.all([fetch(`${ep}/parts/${encodeURIComponent(I.rb)}`),k&&I.bl?blGetLocal(bk):null]);
  let j=null;try{j=await r.json();}catch(e){}
  const rbOk=j&&j.ok;
  if(!rbOk&&r.status!==404)throw new Error((j&&j.error)||'Could not load the parts list.');
  const D={rb:rbOk?j.rb:null,bl:k&&loc?loc:null,I};
  // collector with keys: fetch BrickLink's list with their own keys (missing or older than 180 days); kept in this browser only
  if(k&&I.bl&&!fresh(loc)){
    const p=fetch(`${ep}/bl/parts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({creds:k,type:I.t,no:I.bl})})
      .then(x=>x.json()).then(x=>{if(x&&x.ok&&x.bl&&x.bl.e&&x.bl.e.length){const v={e:x.bl.e,t:x.bl.t};blPutLocal(bk,v);D.bl=v;onUpdate&&onUpdate(D);}}).catch(()=>{});
    if(!D.rb){await p;if(!D.bl)return null;}
  }
  if(!D.rb&&!D.bl)return null;
  MEM.set(mk,D);return D;
}
// ---------- building the lines ----------
const isSheetName=n=>/^sticker sheet/i.test(n||'');
const firstWords=n=>{const w=String(n||'').replace(/[^A-Za-z ]/g,' ').trim().split(/\s+/);return w[0]==='Technic'||w[0]==='Minifigure'||w[0]==='Minifig'?w.slice(0,2).join(' '):(w[0]||'Other');};
const rbImg=(img,p,bl)=>typeof img==='number'?`https://cdn.rebrickable.com/media/thumbs/parts/elements/${img}.jpg/85x85p.jpg`:img?`https://cdn.rebrickable.com/media/thumbs/parts/${img}/85x85p.jpg`:(bl!=null?blImg(bl,p):'');
const blImg=(c,no)=>`https://img.bricklink.com/ItemImage/PT/${c}/${encodeURIComponent(no)}.t1.png`;
const blBig=(c,no)=>`https://img.bricklink.com/ItemImage/PN/${c}/${encodeURIComponent(no)}.png`;
const dec=s=>String(s||'').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/&amp;/g,'&').replace(/&quot;/g,'"');
const baseOf=no=>String(no).replace(/(pb|px|pat|pr)\d+[a-z]?$/i,'');
function colorOfBL(c){const x=BLC[c];return {n:x?x[0]:'Color '+c,rgb:x?x[1]:'9BA19D',bl:c};}
function colorOfRB(c){const x=RBC[c];if(c===9999||c===-1)return {n:'No color',rgb:'D9D9D9',bl:0};return {n:x?x[0]:'Color '+c,rgb:x?x[1]:'9BA19D',bl:x&&x[2]!=null?x[2]:null};}

function fromRB(rb){
  const L=[];
  for(const [p,c,q,img] of rb.p||[]){
    const nm=(rb.nm&&rb.nm[p])||['Part '+p,0],col=colorOfRB(c),sheet=nm[1]===58&&isSheetName(nm[0]);
    L.push({k:sheet?'stk|'+p:p+'|'+(col.bl!=null?col.bl:'r'+c),no:p,name:nm[0],col,q,img:rbImg(img,p,col.bl),grp:CATS[nm[1]]||firstWords(nm[0]),sheet});
  }
  return L;
}
function fromBL(e){
  const reg=[],cps=[],extra=[];
  for(const [T,no,name0,c,q,fl] of e){
    if(T==='M'||T==='S')continue; // minifigs keep their own checkboxes; sub-sets are rare
    const name=dec(name0),col=colorOfBL(c),sheet=isSheetName(name);
    const o={k:sheet?'stk|'+no:no+'|'+c,no,name,col,q,img:blImg(c,no),big:blBig(c,no),grp:firstWords(name),sheet,T};
    if(fl&2)cps.push(o);else reg.push(o);
  }
  // pair each stickered counterpart with its plain part (same color); the plain part's count is split, never added
  const out=reg.map(o=>Object.assign({rem:o.q},o));const paired=[];
  for(const cp of cps){
    if(!/\(stickers?\)/i.test(cp.name))continue; // other counterparts are assembled versions of parts already listed
    const b=baseOf(cp.no);
    let host=out.find(o=>!o.sheet&&o.rem>0&&o.no===b&&o.col.bl===cp.col.bl)||out.find(o=>!o.sheet&&o.rem>0&&o.col.bl===cp.col.bl&&b.length>=3&&(o.no.startsWith(b)||b.startsWith(o.no)));
    if(!host){extra.push(cp);continue;}
    const n=Math.min(cp.q,host.rem);host.rem-=n;
    paired.push({k:host.no+'|'+host.col.bl+'|'+cp.no,no:host.no,name:host.name,col:host.col,q:n,img:host.img,grp:host.grp,st:{no:cp.no,name:cp.name.replace(/\s*-\s*Sets?\s.*$/,''),img:blImg(cp.col.bl,cp.no),big:blBig(cp.col.bl,cp.no)}});
  }
  const L=[];
  for(const o of out){if(o.rem>0){const x=Object.assign({},o,{q:o.rem});delete x.rem;L.push(x);}}
  L.push(...paired);
  // stickered assemblies (several plain parts with one sticker) can't be paired with a single part: shown on the sheet line
  const sheets=L.filter(o=>o.sheet);if(sheets.length&&extra.length)sheets[0].uses=extra.map(x=>x.name.replace(/\s*-\s*Sets?\s.*$/,''));
  return L;
}
function build(D){
  const useBL=!!(D.bl&&D.bl.e&&D.bl.e.some(x=>x[0]==='P'));
  const L=useBL?fromBL(D.bl.e):(D.rb?fromRB(D.rb):[]);
  L.sort((a,b)=>(a.sheet-b.sheet)||a.name.localeCompare(b.name)||a.col.n.localeCompare(b.col.n));
  // merge accidental duplicate keys
  const m=new Map();for(const o of L){const x=m.get(o.k);if(x)x.q+=o.q;else m.set(o.k,o);}
  return {src:useBL?'bl':'rb',lines:[...m.values()],hasStickers:useBL&&L.some(o=>o.st),date:useBL?D.bl.t:''};
}

// ---------- have counts ----------
function ensure(kind,id,cond){let r=rec(kind,id);if(!r){r={b:newCond(cond)?1:0,h:{},sa:{},t:Date.now()};bag(kind)[id]=r;}return r;}
function have(r,o,cond){if(r&&o.k in r.h)return Math.min(o.q,r.h[o.k]);const b=r?r.b:(newCond(cond)?1:0);return b?o.q:0;}
// a list built from a different source (Rebrickable before, BrickLink now): carry the plain-part counts over to the paired lines
function migrate(r,M){
  if(!r||r.src===M.src)return;
  if(M.src==='bl'){const base={};for(const o of M.lines)if(o.st){const bk=o.no+'|'+o.col.bl;if(bk in r.h&&!(o.k in r.h)){base[bk]=base[bk]==null?r.h[bk]:base[bk];const n=Math.min(o.q,base[bk]);r.h[o.k]=n;base[bk]-=n;}}
    for(const bk in base)r.h[bk]=Math.max(0,base[bk]);}
  r.src=M.src;
}
function tally(M,r,cond){
  let n=0,L=0,m=0,l=0,k=0;
  for(const o of M.lines){const h=have(r,o,cond);if(o.sheet){if(h<o.q)k+=o.q-h;continue;}n+=o.q;L++;if(h<o.q){m+=o.q-h;l++;}}
  return {n,L,m,l,k};
}
function storeSummary(kind,id,M,cond){const r=rec(kind,id);if(!r)return;r.s=tally(M,r,cond);r.t=Date.now();save();}

// ---------- public summary (tiles, badge, export) ----------
// started: the collector has touched the checklist (or said check all / uncheck all)
function summary(kind,id,cond){
  const r=rec(kind,id);
  if(!r)return newCond(cond)?{state:'complete'}:{state:'none'};
  const s=r.s;if(!s)return {state:r.b?'complete':'started',m:0,l:0,k:0};
  return {state:(s.m||s.k)?'missing':'complete',m:s.m,l:s.l,k:s.k,n:s.n,L:s.L};
}
function missingText(kind,id){const s=summary(kind,id);if(s.state!=='missing')return '';
  const b=[];if(s.m)b.push(`${s.m} part${s.m>1?'s':''} in ${s.l} lot${s.l>1?'s':''}`);if(s.k)b.push(s.k>1?`${s.k} sticker sheets`:'sticker sheet');return b.join(', ');}

// ---------- rendering ----------
function swatch(c){return `<i class="pl-sw" style="background:#${H(c.rgb)}"></i>`;}
function rowHTML(o,h,sa){
  const full=h>=o.q,part=h>0&&!full,need=o.q;
  const img=`<span class="pl-im${o.st?' pl-pair':''}"><img alt="" loading="lazy" decoding="async" src="${H(o.img)}" onerror="this.onerror=null;${o.big?`this.src='${H(o.big)}'`:`this.style.visibility='hidden'`}">${o.st?`<img class="pl-stk" alt="" loading="lazy" decoding="async" src="${H(o.st.img)}" onerror="this.onerror=null;this.src='${H(o.st.big)}'"><b class="pl-stl">Sticker</b>`:''}${o.sheet?'<b class="pl-stl">Sheet</b>':''}</span>`;
  const sub=o.sheet?`Sticker sheet · ${H(o.no)}${o.uses?` · also for: ${H(o.uses.slice(0,3).join('; '))}${o.uses.length>3?'…':''}`:''} · not counted in pieces`
    :`${swatch(o.col)}${H(o.col.n)} · ${H(o.no)}${need===1?'<span class="pl-x1"> · ×1</span>':''}`;
  const stk=o.st?`<span class="pl-sti">With sticker: ${H(o.st.name)} <span class="pl-stno">(${H(o.st.no)})</span></span><button type="button" class="pl-sa" data-sa aria-pressed="${sa?'true':'false'}">${sa?'Sticker applied':'Sticker not applied'}</button>`:'';
  const qty=need>1?`<div class="pl-q"><button type="button" data-d="-1" aria-label="One less">−</button><output class="${full?'ok':part?'pt':''}">${h}/${need}</output><button type="button" data-d="1" aria-label="One more">+</button></div>`:`<div class="pl-q one"><output class="${full?'ok':''}">${full?1:0}/1</output></div>`;
  return `<div class="pl-r${full?' done':part?' part':''}${o.sheet?' sheet':''}" data-k="${H(o.k)}"><button type="button" class="pl-ck" role="checkbox" aria-checked="${full?'true':part?'mixed':'false'}" aria-label="Have ${H(o.name)}${o.st?' with sticker':''}"></button>${img}<div class="pl-t"><b>${H(o.name)}</b><small>${sub}</small>${stk}</div>${qty}</div>`;
}
function mount(slot,kind,id,getCond,onChange){
  const el=document.createElement('div');el.className='pl';el.dataset.id=kind+':'+id;
  el.innerHTML=`<div class="pl-load"><span class="pl-spin"></span>Loading parts list…</div>`;
  slot.replaceWith(el);
  let M=null,onlyMiss=false,grp='color';
  const cond=()=>{try{return getCond?getCond():'';}catch(e){return '';}};
  const head=()=>{
    const r=rec(kind,id),s=tally(M,r,cond()),started=!!r||newCond(cond());
    const done=s.n-s.m,pct=s.n?Math.round(done/s.n*100):0;
    let msg;
    if(!started)msg=`<b>Not checked yet.</b> Tick the parts you have. ${s.n.toLocaleString()} parts in ${s.L} lots.`;
    else if(!s.m&&!s.k)msg=`<b class="ok">Complete.</b> All ${s.n.toLocaleString()} parts in ${s.L} lots checked.`;
    else msg=`<b class="ms">Missing ${s.m.toLocaleString()} part${s.m===1?'':'s'} in ${s.l} lot${s.l===1?'':'s'}</b>${s.k?` + ${s.k>1?s.k+' sticker sheets':'sticker sheet'}`:''} · ${done.toLocaleString()} of ${s.n.toLocaleString()} checked`;
    return {html:`<div class="pl-sum">${msg}</div><div class="pl-bar"><i style="width:${started?pct:0}%"></i></div>`,s,started};
  };
  const paintHead=()=>{const h=head();el.querySelector('.pl-head').innerHTML=h.html;const w=el.querySelector('[data-wl]');if(w)w.hidden=!(h.started&&(h.s.m||h.s.k));
    const f=el.querySelector('.pl-only');if(f)f.textContent=onlyMiss?'Show all parts':`Show missing only${h.started&&(h.s.l||h.s.k)?' ('+(h.s.l+(h.s.k?1:0))+')':''}`;};
  const groups=()=>{const g=new Map();for(const o of M.lines){const key=o.sheet?'Stickers':grp==='color'?o.col.n:o.grp;if(!g.has(key))g.set(key,{c:o.sheet?null:(grp==='color'?o.col:null),L:[]});g.get(key).L.push(o);}
    const arr=[...g.entries()];arr.sort((a,b)=>(a[0]==='Stickers')-(b[0]==='Stickers')||b[1].L.length-a[1].L.length||a[0].localeCompare(b[0]));return arr;};
  const paintList=()=>{
    const r=rec(kind,id),c=cond();let html='',shown=0;
    for(const [name,g] of groups()){
      const rows=g.L.filter(o=>!onlyMiss||have(r,o,c)<o.q);if(!rows.length)continue;shown+=rows.length;
      html+=`<section class="pl-g"><h5>${g.c?swatch(g.c):''}${H(name)} <span>${rows.length}</span></h5>${rows.map(o=>rowHTML(o,have(r,o,c),!!(r&&r.sa&&r.sa[o.k]))).join('')}</section>`;
    }
    el.querySelector('.pl-list').innerHTML=html||`<p class="pl-empty">${onlyMiss?'Nothing missing. This one is complete.':'No parts listed.'}</p>`;
  };
  const changed=()=>{storeSummary(kind,id,M,cond());paintHead();onChange&&onChange();};
  const setHave=(o,n)=>{const r=ensure(kind,id,cond());r.h[o.k]=Math.max(0,Math.min(o.q,n));
    const row=el.querySelector(`.pl-r[data-k="${CSS.escape(o.k)}"]`);
    if(row){if(onlyMiss&&r.h[o.k]>=o.q){row.classList.add('done');row.querySelector('.pl-ck').setAttribute('aria-checked','true');setTimeout(()=>{if(row.isConnected&&onlyMiss&&have(rec(kind,id),o,cond())>=o.q)row.remove();},450);}
      else{const tmp=document.createElement('div');tmp.innerHTML=rowHTML(o,have(r,o,cond()),!!(r.sa&&r.sa[o.k]));row.replaceWith(tmp.firstChild);}}
    changed();};
  const paint=()=>{
    const src=M.src==='bl'?`BrickLink inventory, fetched with your BrickLink keys${M.date?' on '+H(M.date):''} and saved on this device${M.hasStickers?'. Stickered parts are paired with their plain part':''}`:`Rebrickable inventory (plain parts and sticker sheets)${blKeys()?'':'. Connect BrickLink on the Value tab to see stickered parts'}`;
    el.innerHTML=`<div class="pl-head"></div>
<div class="pl-tools"><button type="button" class="pl-btn" data-all="1">Check all</button><button type="button" class="pl-btn" data-all="0">Uncheck all</button><button type="button" class="pl-btn pl-only" aria-pressed="${onlyMiss}"></button>
<label class="pl-grp">Group <select data-grp><option value="color">Color</option><option value="type">Type</option></select></label></div>
<div class="pl-list"></div>
<div class="pl-foot"><button type="button" class="pl-btn" data-wl hidden>BrickLink Wanted List (XML)</button><span>Parts list: ${src}. Spare parts not included.${kind==='set'?' Minifigs are below.':''}</span></div>`;
    el.querySelector('[data-grp]').value=grp;
    paintHead();paintList();
  };
  el.addEventListener('click',e=>{
    const t=e.target;if(!M)return;
    const row=t.closest('.pl-r');
    if(row){const o=M.lines.find(x=>x.k===row.dataset.k);if(!o)return;const r=rec(kind,id),h=have(r,o,cond());
      if(t.closest('[data-sa]')){const rr=ensure(kind,id,cond());rr.sa=rr.sa||{};if(rr.sa[o.k])delete rr.sa[o.k];else rr.sa[o.k]=1;save();const b=t.closest('[data-sa]');b.setAttribute('aria-pressed',rr.sa[o.k]?'true':'false');b.textContent=rr.sa[o.k]?'Sticker applied':'Sticker not applied';return;}
      const d=t.closest('[data-d]');
      if(d){setHave(o,h+(+d.dataset.d));return;}
      if(t.closest('.pl-ck')||t.closest('.pl-im')||t.closest('.pl-t')||t.closest('.pl-q.one')){setHave(o,h>=o.q?0:o.q);return;}
      if(t.closest('.pl-q output')){setHave(o,h>=o.q?0:h+1);return;} // tap the count to add one (wraps to 0)
      return;}
    const a=t.closest('[data-all]');
    if(a){const r=ensure(kind,id,cond());r.b=+a.dataset.all;r.h={};changed();paintList();return;}
    if(t.closest('.pl-only')){onlyMiss=!onlyMiss;t.closest('.pl-only').setAttribute('aria-pressed',onlyMiss);paintHead();paintList();return;}
    if(t.closest('[data-wl]')){wanted(kind,id,M,cond());return;}
  });
  el.addEventListener('change',e=>{if(e.target.matches('[data-grp]')){grp=e.target.value;paintList();}});
  const ready=D=>{if(!el.isConnected&&!el.parentNode)return;M=build(D);const r=rec(kind,id);if(r){migrate(r,M);storeSummary(kind,id,M,cond());}paint();onChange&&onChange();};
  load(kind,id,ready).then(D=>{if(!D){el.innerHTML=`<p class="pl-empty">No parts list for this ${kind==='set'?'set':'minifig'} yet.</p>`;return;}ready(D);})
    .catch(err=>{el.innerHTML=`<p class="pl-empty">${H(err.message||'Could not load the parts list.')} <button type="button" class="pl-btn" data-retry>Try again</button></p>`;
      const b=el.querySelector('[data-retry]');if(b)b.onclick=()=>{MEM.delete(kind+':'+id);const s=document.createElement('div');el.replaceWith(s);mount(s,kind,id,getCond,onChange);};});
  el.refreshCond=()=>{if(M){paintHead();paintList();}};
  return el;
}

// ---------- BrickLink Wanted List XML ----------
function wanted(kind,id,M,cond){
  const r=rec(kind,id),items=[];let skipped=0;
  for(const o of M.lines){const miss=o.q-have(r,o,cond);if(miss<=0)continue;
    const no=o.st?o.st.no:o.no,c=o.sheet?0:o.col.bl;if(c==null){skipped++;continue;}
    items.push(`<ITEM><ITEMTYPE>P</ITEMTYPE><ITEMID>${H(no)}</ITEMID><COLOR>${c}</COLOR><MINQTY>${miss}</MINQTY><CONDITION>X</CONDITION><REMARKS>${H((kind==='set'?'Set ':'Minifig ')+id+(o.st?', or '+o.no+' plus sticker':''))}</REMARKS><NOTIFY>N</NOTIFY></ITEM>`);}
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n${items.join('\n')}\n</INVENTORY>\n`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/xml'}));a.download=`wanted-${id}.xml`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  const n=document.createElement('div');n.className='pl-note';n.textContent=`Saved ${items.length} lot${items.length===1?'':'s'} as wanted-${id}.xml. On BrickLink: Want > Upload, then pick the file.${skipped?` ${skipped} lot${skipped>1?'s have':' has'} no BrickLink color and ${skipped>1?'were':'was'} left out.`:''}${M.src==='rb'?' Part numbers come from Rebrickable; a few may differ on BrickLink.':''}`;
  const f=document.querySelector(`.pl[data-id="${CSS.escape(kind+':'+id)}"] .pl-foot`);if(f){const old=f.querySelector('.pl-note');if(old)old.remove();f.appendChild(n);}
  return xml;
}

// ---------- export / import (one CSV column, compact JSON) ----------
function exportField(kind,id){const r=rec(kind,id);if(!r)return '';const o={b:r.b};if(Object.keys(r.h).length)o.h=r.h;if(r.sa&&Object.keys(r.sa).length)o.sa=r.sa;if(r.src)o.src=r.src;if(r.s)o.s=r.s;return JSON.stringify(o);}
function importField(kind,id,txt){if(rec(kind,id))return false;let o;try{o=JSON.parse(txt);}catch(e){return false;}if(!o||typeof o!=='object')return false;
  const clean={b:o.b?1:0,h:{},sa:{},t:Date.now()};for(const k in (o.h||{})){const n=parseInt(o.h[k],10);if(n>=0&&k.length<80)clean.h[k]=n;}for(const k in (o.sa||{}))if(k.length<80)clean.sa[k]=1;
  if(o.src==='bl'||o.src==='rb')clean.src=o.src;if(o.s&&typeof o.s==='object'){const s={};for(const f of ['m','l','k','n','L'])s[f]=Math.max(0,parseInt(o.s[f],10)||0);clean.s=s;}
  bag(kind)[id]=clean;save();return true;}
function clear(kind,id){delete bag(kind)[id];save();}

// ---------- styles ----------
const css=document.createElement('style');css.textContent=`
.pl{margin-top:6px}
.pl-load,.pl-empty{color:#E4E5E2;font-size:14px;padding:10px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pl-spin{width:16px;height:16px;border:3px solid #F2CD37;border-top-color:transparent;border-radius:50%;animation:plspin .8s linear infinite}
@keyframes plspin{to{transform:rotate(360deg)}}
.pl-head{position:sticky;top:-1px;z-index:3;background:#05131D;padding:6px 40px 6px 0;margin-right:-4px}
.pl-sum{font-size:14px;line-height:1.35}
.pl-sum b.ms{color:#FFB3A8}.pl-sum b.ok{color:#C6E86B}
.pl-bar{height:8px;background:#3A3D40;border-radius:4px;margin-top:6px;overflow:hidden;border:1px solid #05131D}
.pl-bar i{display:block;height:100%;background:#A5CA18;box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
.pl-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 8px}
.pl-btn{background:#3A3D40;color:#F2F3F2;border:1.5px solid #05131D;border-radius:6px;padding:7px 10px;font-size:13px;font-weight:700;cursor:pointer;min-height:36px;margin:0}
.pl-btn[aria-pressed="true"]{background:#C91A09;border-color:#05131D}
.pl-grp{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#E4E5E2;white-space:nowrap;margin-left:auto}
.pl-grp select{min-height:36px;margin:0}
.pl-g{content-visibility:auto;contain-intrinsic-size:auto 400px}
.pl-g h5{margin:10px 0 4px;font-size:13px;color:#F2CD37;display:flex;align-items:center;gap:6px;text-transform:none}
.pl-g h5 span{color:#E4E5E2;font-weight:400}
.pl-sw{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #05131D;vertical-align:-1px;margin-right:4px;flex:0 0 auto}
.pl-g h5 .pl-sw{margin-right:0}
.pl-r{display:grid;grid-template-columns:28px 56px minmax(0,1fr) auto;grid-template-areas:'ck im t q';align-items:center;gap:4px 8px;background:#3A3D40;border:1.5px solid #05131D;border-radius:8px;padding:6px;margin-bottom:6px;transition:opacity .3s}
.pl-r.done{background:#33402A;border-color:#05131D}
.pl-r.part{background:#4A4330}
.pl-ck{grid-area:ck;width:28px;height:28px;border-radius:6px;border:2px solid #05131D;background:#F2F3F2;cursor:pointer;padding:0;margin:0;position:relative;box-shadow:inset 0 -3px 0 #BFC3C0}
.pl-r.done .pl-ck{background:#A5CA18;box-shadow:inset 0 -3px 0 #6E8A10}
.pl-r.done .pl-ck::after{content:"";position:absolute;left:8px;top:3px;width:7px;height:13px;border:solid #05131D;border-width:0 3px 3px 0;transform:rotate(45deg)}
.pl-r.part .pl-ck{background:#F2CD37;box-shadow:inset 0 -3px 0 #A8861A}
.pl-r.part .pl-ck::after{content:"";position:absolute;left:6px;top:11px;width:12px;height:3px;background:#05131D}
.pl-im{grid-area:im;width:56px;height:56px;background:#F2F3F2;border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;cursor:pointer}
.pl-im img{max-width:52px;max-height:52px;object-fit:contain}
.pl-im.pl-pair img:first-child{max-width:40px;max-height:40px;position:absolute;left:2px;top:2px}
.pl-im img.pl-stk{position:absolute;right:1px;bottom:9px;max-width:32px;max-height:32px;background:#fff;border:1.5px solid #05131D;border-radius:4px}
.pl-stl{position:absolute;left:0;right:0;bottom:0;background:#F2CD37;color:#05131D;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.3px;text-align:center;line-height:10px}
.pl-t{grid-area:t;min-width:0;cursor:pointer}
.pl-t b{display:block;font-size:13px;line-height:1.25;overflow-wrap:anywhere}
.pl-t small{display:block;font-size:12px;color:#E4E5E2;margin-top:2px;overflow-wrap:anywhere}
.pl-sti{display:block;font-size:12px;color:#FFE68A;margin-top:3px;overflow-wrap:anywhere}
.pl-stno{color:#E4E5E2}
.pl-sa{margin:4px 0 0;background:transparent;border:1.5px dashed #E4E5E2;color:#E4E5E2;border-radius:5px;font-size:11px;font-weight:700;padding:3px 7px;cursor:pointer;min-height:26px}
.pl-sa[aria-pressed="true"]{border-style:solid;border-color:#05131D;background:#F2CD37;color:#05131D}
.pl-q{grid-area:q;display:flex;align-items:center;gap:2px}
.pl-x1{display:none}
.pl-q button{width:32px;height:36px;border-radius:6px;border:1.5px solid #05131D;background:#F2CD37;color:#05131D;font-size:18px;font-weight:900;padding:0;margin:0;cursor:pointer;box-shadow:inset 0 -3px 0 #A8861A}
.pl-q output{min-width:44px;text-align:center;font-weight:800;font-size:14px;color:#FFB3A8;cursor:pointer;font-variant-numeric:tabular-nums}
.pl-q output.ok{color:#C6E86B}.pl-q output.pt{color:#FFE68A}
.pl-q.one output{min-width:36px}
.pl-foot{margin-top:8px;font-size:12px;color:#E4E5E2;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.pl-note{background:#05131D;border-radius:6px;padding:6px 8px;color:#F2F3F2}
@media (max-width:520px){.pl-r{grid-template-columns:28px 52px minmax(0,1fr);grid-template-areas:'ck im t' 'ck im q';padding:6px 6px 6px 6px}.pl-im{width:52px;height:52px}.pl-im img{max-width:48px;max-height:48px}.pl-q{justify-self:end}.pl-q.one{display:none}.pl-x1{display:inline}.pl-q button{width:34px;height:32px}}
`;document.head.appendChild(css);

window.StudParts={mount,clearBrickLinkCopies:blClearLocal,summary,missingText,exportField,importField,clear,build,wanted:(kind,id)=>{const D=MEM.get(kind+':'+id);return D?wanted(kind,id,build(D),''):null;},
  _state:()=>JSON.parse(JSON.stringify(ST)),_flush:flush};
})();
