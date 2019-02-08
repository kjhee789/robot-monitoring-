//SimpleServer
const http = require('http');
const path = require('path');

//express related
const express = require('express');
const bodyParser = require('body-parser');

//map data 
var mapObj;
var sizeX;
var sizeY;
var curX;//column
var curY;//row
var interval;

//directing data
var lastDir;//location object
var _Direction = {"N":1, "S":2, "W":3, "E":4, "X":0}
var routes = [];

//analytic data
var wholeSpaces=0;
var cleanedSpaces=0;


/////////////////////////////////////////////////////////////////
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
/////////////////////////////////////////////////////////////////
var router = express();
var server = http.createServer(router);

//tell the router (i.e. express) where to find static files
router.use(express.static(path.resolve(__dirname, 'client')));

//tell the router to parse JSON data for us and put it into req.body
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

/////////////////////////////////////////////////////////////////
// Routing 
//
/////////////////////////////////////////////////////////////////
router.post('/sendMap', function(req, res, next) {
    //var sendObj = req.body.data;
    //mapObj = sendObj.data;
    mapObj = req.body.data;
    sizeY = mapObj.length;
    sizeX = mapObj[0].length;
    curX=1;
    curY=1;
    cleanedSpaces=0;
    
    //calculating spaces
    var cnt=0;
    for(var i=0;i<sizeY;i++){
        for( var j=0;j<sizeX;j++){
            if(mapObj[i][j].value!='#') cnt++
        }
    }
    wholeSpaces = cnt;
    //console.log("sendMap>>"+mapObj);
    console.log("spaces,cnt:"+wholeSpaces+'/'+cnt);
    console.log("sizeX,sizeY:"+sizeX+'/'+sizeY);
    res.json({data:mapObj,curX:curX,curY:curY,spaces:wholeSpaces,cSpaces:cleanedSpaces});
});

router.post('/startBot', function(req, res, next) {
   curX=1;
   curY=1;
   mapObj[curY][curX].status=='C'
   routes = []//initialization
   console.log("startBot server");
   interval = setInterval(stepClean,500);
   res.json({data:mapObj,curX:curX,curY:curY});
});

router.post('/monitorBot', function(req, res, next) {
    //console.log("monitormap>>"+mapObj);
    //calculating 
    var cnt=0;
    for(var i=0;i<sizeY;i++){
        for( var j=0;j<sizeX;j++){
            if(mapObj[i][j].status=='C') cnt++
        }
    }
    cleanedSpaces = cnt;
    console.log("spaces,cnt:"+cleanedSpaces+'/'+cnt);
    if(isCleaningComplete()){
        //
        //stop process 
        clearInterval(interval);
        var message="complete";
        traceRoute();
    }
    res.json({data:mapObj,curX:curX,curY:curY,msg:message,cSpaces:cleanedSpaces});
});
/////////////////////////////////////////////////////////////////
// Robot Cleaning Logic
//
/////////////////////////////////////////////////////////////////
function stepClean(){
    //1.start with curX(col), curY(row)
    //2.four direction check (E,W,S,N) -> start first possible 
    //mapObj[curY][curX].status="C";
    mapObj[curY][curX].status="C";
    //
   
    
    var fDirection = getNextCleaningDirection();
    console.log("next Direction:"+fDirection+"/current : ["+curY+"]["+curX+"]");
    //if direction exists, save last direction and move 
    if(fDirection == _Direction.N){
      curY=curY-1;  
      lastDir = _Direction.N;
      routes.push({row:curY,col:curX,fDirection:lastDir});
    }else if(fDirection == _Direction.S){
      curY=curY+1;  
      lastDir = _Direction.S;
      routes.push({row:curY,col:curX,fDirection:lastDir});
    }else if(fDirection == _Direction.E){
      curX=curX+1; 
      lastDir = _Direction.E;
      routes.push({row:curY,col:curX,fDirection:lastDir});
    }else if(fDirection == _Direction.W){
      curX=curX-1;
      lastDir = _Direction.W;
      routes.push({row:curY,col:curX,fDirection:lastDir});    
    }
    //routes.push({row:curY,col:curX,fDirection:lastDir});
    else if(fDirection == _Direction.X){

    var tObj = routes.pop();
    switch(tObj.fDirection){
          case _Direction.N: curY=curY+1; lastDir = _Direction.S; break;
          case _Direction.S: curY=curY-1; lastDir = _Direction.N; break;  
          case _Direction.W: curX=curX+1; lastDir = _Direction.E; break;
          case _Direction.E: curX=curX-1; lastDir = _Direction.W; break; 
      default:
    }
    }
    
    
    
    
    //mapObj[curY][curX].status="C"
};

function getNextCleaningDirection(){
    console.log("~~~~~~"+curX+curY);
    //boundary check !!
    //ordered in priority 
    ///////////////////////////////////////////////////////////
    //1. Right next to a uncleaned spaces
    if(curY-1>=0 && mapObj[curY-1][curX].value!="#" && mapObj[curY-1][curX].status!="C"){
        console.log("nnn ["+curY+"]["+curX+"]");
        return _Direction.N;
    }
    if(curY+1<sizeY && mapObj[curY+1][curX].value!="#" && mapObj[curY+1][curX].status!="C"){
        console.log("sss ["+curY+"]["+curX+"]");
        return _Direction.S;
    }
    if(curX-1>=0  && mapObj[curY][curX-1].value!="#" && mapObj[curY][curX-1].status!="C"){
        console.log("www ["+curY+"]["+curX+"]");
        return _Direction.W;
    }
    if(curX+1<sizeX && mapObj[curY][curX+1].value!="#" && mapObj[curY][curX+1].status!="C"){
         console.log("eee ["+curY+"]["+curX+"]");
        return _Direction.E;
    }
    ///////////////////////////////////////////////////////////
    //2. check any available space on the way to the designated direction    
    //check any available space on the way to North
    for(var i=curY-1;i>=0;i--){
        if(mapObj[i][curX].value=="#") break;//right next space is wall, skip!
        if(mapObj[i][curX].value!="#" && mapObj[i][curX].status!="C")
           return _Direction.N;
    }
    console.log("after checking north");
    for(var i=curY+1;i<=sizeY;i++){
        if(mapObj[i][curX].value=="#") break; 
        if(mapObj[i][curX].value!="#" && mapObj[i][curX].status!="C")
        return _Direction.S;
    }
      console.log("after checking south");
    //check any available space on the way to West
    for(var i=curX-1;i>=0;i--){
        if(mapObj[curY][i].value=="#") break; 
        if(mapObj[curY][i].value!="#" && mapObj[curY][i].status!="C")
        return _Direction.W;
    }
      console.log("after checking west");
    //check any available space on the way to East
    for(var i=curX+1;i>=0;i++){
        if(mapObj[curY][i].value=="#")break;
        if(mapObj[curY][i].value!="#" && mapObj[curY][i].status!="C")
        return _Direction.E;
    }  
    console.log("after checking east");
    return _Direction.X;
    //current pop
    /*
    var tObj = routes.pop();
    switch(tObj.fDirection){
      case _Direction.N: return _Direction.S;
      case _Direction.S: return _Direction.N;  
      case _Direction.W: return _Direction.E;  
      case _Direction.E: return _Direction.W;  
      default:
    }
    */
    
    
/*
    for(var i=0;i<sizeY;i++){
        for( var j=0;j<sizeX;j++){
            
            if(mapObj[i][j].value=='#') continue;
            if(mapObj[i][j].status!="C"){
                if(mapObj[curY-1][curX].value!="#" && curY-i>0){//north direction
                    console.log("closest north !["+i+"]["+j+"]" );
                    return _Direction.N
                }else if(curY-i<0){
                    console.log("closest south !["+i+"]["+j+"]" );
                    return _Direction.S
                }else if(curX-j>0){
                    console.log("closest east !["+i+"]["+j+"]" );
                    return _Direction.E;
                }else if(curX-j<0){
                    console.log("closest west !["+i+"]["+j+"]" );
                    return _Direction.W;
                }
            }//if
        }
    }
  */
  
    
    ///////////////////////////////////////////////////////////
    // 3. go to the previous route 
    /////////////////
    
    
    /* 3 become suceess, delete below
    if(mapObj[curY-1][curX].value!="#" ){
        console.log("nnn"+curX+","+curY);
        return _Direction.N;
    }
    if(mapObj[curY+1][curX].value!="#"){
        console.log("sss"+curX+","+curY);
        return _Direction.S;
    }
    if(mapObj[curY][curX-1].value!="#" ){
        console.log("www"+curX+","+curY);
        return _Direction.W;
    }
    if(mapObj[curY][curX+1].value!="#" ){
         console.log("eee"+curX+","+curY);
        return _Direction.E;
    }
*/
    console.log("after checking east");
    console.log("~~~~~~switch");
   /*
    switch(lastDir){
          case _Direction.N: mapObj[curY-1][curX].value!="#"; return _Direction.S;
          case _Direction.S: mapObj[curY+1][curX].value!="#"; return _Direction.N;  
          case _Direction.W: mapObj[curY+1][curX].value!="#"; return _Direction.E;  
          case _Direction.E: mapObj[curY+1][curX].value!="#"; return _Direction.W;  
          default:
      }
    
    return _Direction.X;
    */
}
function isCleaningComplete(){
   for(var i=0;i<sizeY;i++){
    for( var j=0;j<sizeX;j++){
        if(mapObj[i][j].value=='#') continue;
        if(mapObj[i][j].status=='X') return false;
    }
    //console.log("loop in iscleaningcomplete row"+i);
   }
   console.log("clean up");
   return true;
} 
function traceRoute(){
  var str = "";
  routes.forEach(function(item){
    str += item;
    str +="\n";
  });
  console.log("route string:"+str);
}

/////////////////////////////////////////////////////////////////
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
