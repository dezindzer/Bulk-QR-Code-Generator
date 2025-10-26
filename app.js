/* ====== QRCode LIB with SVG renderer (embedded) ====== */
var QRCode;
(function(){
  function QR8bitByte(data){ this.mode=QRMode.MODE_8BIT_BYTE; this.data=data; this.parsedData=[];
    for(var i=0,l=data.length;i<l;i++){var a=[],code=data.charCodeAt(i);
      if(code>0x10000){a[0]=0xF0|((code&0x1C0000)>>>18);a[1]=0x80|((code&0x3F000)>>>12);a[2]=0x80|((code&0xFC0)>>>6);a[3]=0x80|(code&0x3F);}
      else if(code>0x800){a[0]=0xE0|((code&0xF000)>>>12);a[1]=0x80|((code&0xFC0)>>>6);a[2]=0x80|(code&0x3F);}
      else if(code>0x80){a[0]=0xC0|((code&0x7C0)>>>6);a[1]=0x80|(code&0x3F);}
      else{a[0]=code;}
      this.parsedData.push(a);
    }
    this.parsedData=Array.prototype.concat.apply([],this.parsedData);
    if(this.parsedData.length!=this.data.length){ this.parsedData.unshift(191,187,239); }
  }
  QR8bitByte.prototype={ getLength:function(){return this.parsedData.length;}, write:function(b){ for(var i=0,l=this.parsedData.length;i<l;i++) b.put(this.parsedData[i],8); }};

  function QRCodeModel(typeNumber, ecl){ this.typeNumber=typeNumber; this.errorCorrectLevel=ecl; this.modules=null; this.moduleCount=0; this.dataCache=null; this.dataList=[]; }
  QRCodeModel.prototype={
    addData:function(d){ this.dataList.push(new QR8bitByte(d)); this.dataCache=null; },
    isDark:function(r,c){ if(r<0||this.moduleCount<=r||c<0||this.moduleCount<=c) throw new Error(r+","+c); return this.modules[r][c]; },
    getModuleCount:function(){ return this.moduleCount; },
    make:function(){ this.makeImpl(false,this.getBestMaskPattern()); },
    makeImpl:function(test,mask){
      this.moduleCount=this.typeNumber*4+17; this.modules=new Array(this.moduleCount);
      for(var r=0;r<this.moduleCount;r++){ this.modules[r]=new Array(this.moduleCount); for(var c=0;c<this.moduleCount;c++) this.modules[r][c]=null; }
      this.setupPositionProbePattern(0,0);
      this.setupPositionProbePattern(this.moduleCount-7,0);
      this.setupPositionProbePattern(0,this.moduleCount-7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test,mask);
      if(this.typeNumber>=7) this.setupTypeNumber(test);
      if(this.dataCache==null) this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);
      this.mapData(this.dataCache,mask);
    },
    setupPositionProbePattern:function(row,col){
      for(var r=-1;r<=7;r++){ if(row+r<=-1||this.moduleCount<=row+r) continue;
        for(var c=-1;c<=7;c++){ if(col+c<=-1||this.moduleCount<=col+c) continue;
          if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)) this.modules[row+r][col+c]=true;
          else this.modules[row+r][col+c]=false;
        }
      }
    },
    getBestMaskPattern:function(){ var min=0,p=0; for(var i=0;i<8;i++){ this.makeImpl(true,i); var lost=QRUtil.getLostPoint(this); if(i==0||min>lost){ min=lost; p=i; } } return p; },
    setupTimingPattern:function(){ for(var r=8;r<this.moduleCount-8;r++){ if(this.modules[r][6]!=null) continue; this.modules[r][6]=(r%2==0); }
                                   for(var c=8;c<this.moduleCount-8;c++){ if(this.modules[6][c]!=null) continue; this.modules[6][c]=(c%2==0); } },
    setupPositionAdjustPattern:function(){
      var pos=QRUtil.getPatternPosition(this.typeNumber);
      for(var i=0;i<pos.length;i++) for(var j=0;j<pos.length;j++){
        var row=pos[i], col=pos[j];
        if(this.modules[row][col]!=null) continue;
        for(var r=-2;r<=2;r++) for(var c=-2;c<=2;c++)
          this.modules[row+r][col+c] = (r==-2||r==2||c==-2||c==2||(r==0&&c==0));
      }
    },
    setupTypeNumber:function(test){ var bits=QRUtil.getBCHTypeNumber(this.typeNumber);
      for(var i=0;i<18;i++){ var mod=(!test&&((bits>>i)&1)==1); this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod; }
      for(var i=0;i<18;i++){ var mod=(!test&&((bits>>i)&1)==1); this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod; }
    },
    setupTypeInfo:function(test,mask){ var data=(this.errorCorrectLevel<<3)|mask; var bits=QRUtil.getBCHTypeInfo(data);
      for(var i=0;i<15;i++){ var mod=(!test&&((bits>>i)&1)==1);
        if(i<6) this.modules[i][8]=mod; else if(i<8) this.modules[i+1][8]=mod; else this.modules[this.moduleCount-15+i][8]=mod;
      }
      for(var i=0;i<15;i++){ var mod=(!test&&((bits>>i)&1)==1);
        if(i<8) this.modules[8][this.moduleCount-i-1]=mod; else if(i<9) this.modules[8][15-i-1+1]=mod; else this.modules[8][15-i-1]=mod;
      }
      this.modules[this.moduleCount-8][8]=(!test);
    },
    mapData:function(data,mask){ var inc=-1,row=this.moduleCount-1,bitIndex=7,byteIndex=0;
      for(var col=this.moduleCount-1; col>0; col-=2){ if(col==6) col--;
        while(true){
          for(var c=0;c<2;c++){ if(this.modules[row][col-c]==null){ var dark=false; if(byteIndex<data.length) dark=(((data[byteIndex]>>>bitIndex)&1)==1);
              if(QRUtil.getMask(mask,row,col-c)) dark=!dark;
              this.modules[row][col-c]=dark; bitIndex--; if(bitIndex==-1){ byteIndex++; bitIndex=7; } } }
          row+=inc; if(row<0||this.moduleCount<=row){ row-=inc; inc=-inc; break; }
        }
      }
    }
  };

  QRCodeModel.PAD0=0xEC; QRCodeModel.PAD1=0x11;

  QRCodeModel.createData=function(typeNumber,ecl,dataList){
    var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,ecl), buffer=new QRBitBuffer();
    for(var i=0;i<dataList.length;i++){ var d=dataList[i]; buffer.put(d.mode,4); buffer.put(d.getLength(),QRUtil.getLengthInBits(d.mode,typeNumber)); d.write(buffer); }
    var total=0; for(var i=0;i<rsBlocks.length;i++) total+=rsBlocks[i].dataCount;
    if(buffer.getLengthInBits()>total*8) throw new Error("code length overflow.");
    if(buffer.getLengthInBits()+4<=total*8) buffer.put(0,4);
    while(buffer.getLengthInBits()%8!=0) buffer.putBit(false);
    while(buffer.getLengthInBits()<total*8){ buffer.put(QRCodeModel.PAD0,8); if(buffer.getLengthInBits()>=total*8) break; buffer.put(QRCodeModel.PAD1,8); }
    return QRCodeModel.createBytes(buffer,rsBlocks);
  };

  QRCodeModel.createBytes=function(buffer,rsBlocks){
    var offset=0,maxDc=0,maxEc=0, dcdata=new Array(rsBlocks.length), ecdata=new Array(rsBlocks.length);
    for(var r=0;r<rsBlocks.length;r++){
      var dc=rsBlocks[r].dataCount, ec=rsBlocks[r].totalCount-dc;
      maxDc=Math.max(maxDc,dc); maxEc=Math.max(maxEc,ec);
      dcdata[r]=new Array(dc); for(var i=0;i<dc;i++) dcdata[r][i]=0xff & buffer.buffer[i+offset]; offset+=dc;
      var rsPoly=QRUtil.getErrorCorrectPolynomial(ec), rawPoly=new QRPolynomial(dcdata[r], rsPoly.getLength()-1), modPoly=rawPoly.mod(rsPoly);
      ecdata[r]=new Array(rsPoly.getLength()-1); for(var i=0;i<ecdata[r].length;i++){ var mi=i+modPoly.getLength()-ecdata[r].length; ecdata[r][i]=(mi>=0)?modPoly.get(mi):0; }
    }
    var total=0; for(var i=0;i<rsBlocks.length;i++) total+=rsBlocks[i].totalCount;
    var data=new Array(total), idx=0;
    for(var i=0;i<maxDc;i++) for(var r=0;r<rsBlocks.length;r++) if(i<dcdata[r].length) data[idx++]=dcdata[r][i];
    for(var i=0;i<maxEc;i++) for(var r=0;r<rsBlocks.length;r++) if(i<ecdata[r].length) data[idx++]=ecdata[r][i];
    return data;
  };

  var QRMode={ MODE_NUMBER:1<<0, MODE_ALPHA_NUM:1<<1, MODE_8BIT_BYTE:1<<2, MODE_KANJI:1<<3 };
  var QRErrorCorrectLevel={ L:1, M:0, Q:3, H:2 };
  var QRMaskPattern={ PATTERN000:0, PATTERN001:1, PATTERN010:2, PATTERN011:3, PATTERN100:4, PATTERN101:5, PATTERN110:6, PATTERN111:7 };

  var QRUtil={
    PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],
    G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),
    G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),
    G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),
    getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0) d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15))); return ((data<<10)|d)^QRUtil.G15_MASK; },
    getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0) d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18))); return (data<<12)|d; },
    getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}return digit;},
    getPatternPosition:function(type){ return QRUtil.PATTERN_POSITION_TABLE[type-1]; },
    getMask:function(m,i,j){
      switch(m){
        case QRMaskPattern.PATTERN000:return (i+j)%2==0;
        case QRMaskPattern.PATTERN001:return i%2==0;
        case QRMaskPattern.PATTERN010:return j%3==0;
        case QRMaskPattern.PATTERN011:return (i+j)%3==0;
        case QRMaskPattern.PATTERN100:return (Math.floor(i/2)+Math.floor(j/3))%2==0;
        case QRMaskPattern.PATTERN101:return (i*j)%2+(i*j)%3==0;
        case QRMaskPattern.PATTERN110:return ((i*j)%2+(i*j)%3)%2==0;
        case QRMaskPattern.PATTERN111:return ((i*j)%3+(i+j)%2)%2==0;
        default: throw new Error("bad maskPattern:"+m);
      }
    },
    getErrorCorrectPolynomial:function(ec){ var a=new QRPolynomial([1],0); for(var i=0;i<ec;i++) a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0)); return a; },
    getLengthInBits:function(mode,type){
      if(1<=type&&type<10){ if(mode==QRMode.MODE_NUMBER)return 10; if(mode==QRMode.MODE_ALPHA_NUM)return 9; if(mode==QRMode.MODE_8BIT_BYTE)return 8; if(mode==QRMode.MODE_KANJI)return 8; }
      else if(type<27){ if(mode==QRMode.MODE_NUMBER)return 12; if(mode==QRMode.MODE_ALPHA_NUM)return 11; if(mode==QRMode.MODE_8BIT_BYTE)return 16; if(mode==QRMode.MODE_KANJI)return 10; }
      else if(type<41){ if(mode==QRMode.MODE_NUMBER)return 14; if(mode==QRMode.MODE_ALPHA_NUM)return 13; if(mode==QRMode.MODE_8BIT_BYTE)return 16; if(mode==QRMode.MODE_KANJI)return 12; }
      else throw new Error("type:"+type);
    },
    getLostPoint:function(qr){ var mc=qr.getModuleCount(),lost=0;
      for(var r=0;r<mc;r++) for(var c=0;c<mc;c++){ var same=0,dark=qr.isDark(r,c);
        for(var i=-1;i<=1;i++){ if(r+i<0||mc<=r+i) continue; for(var j=-1;j<=1;j++){ if(c+j<0||mc<=c+j) continue; if(i==0&&j==0) continue; if(dark==qr.isDark(r+i,c+j)) same++; } }
        if(same>5) lost+=(3+same-5);
      }
      for(var r=0;r<mc-1;r++) for(var c=0;c<mc-1;c++){ var cnt=0; if(qr.isDark(r,c))cnt++; if(qr.isDark(r+1,c))cnt++; if(qr.isDark(r,c+1))cnt++; if(qr.isDark(r+1,c+1))cnt++; if(cnt==0||cnt==4) lost+=3; }
      for(var r=0;r<mc;r++) for(var c=0;c<mc-6;c++) if(qr.isDark(r,c)&&!qr.isDark(r,c+1)&&qr.isDark(r,c+2)&&qr.isDark(r,c+3)&&qr.isDark(r,c+4)&&!qr.isDark(r,c+5)&&qr.isDark(r,c+6)) lost+=40;
      for(var c=0;c<mc;c++) for(var r=0;r<mc-6;r++) if(qr.isDark(r,c)&&!qr.isDark(r+1,c)&&qr.isDark(r+2,c)&&qr.isDark(r+3,c)&&qr.isDark(r+4,c)&&!qr.isDark(r+5,c)&&qr.isDark(r+6,c)) lost+=40;
      var darkCnt=0; for(var c=0;c<mc;c++) for(var r=0;r<mc;r++) if(qr.isDark(r,c)) darkCnt++; var ratio=Math.abs(100*darkCnt/mc/mc-50)/5; lost+=ratio*10; return lost;
    }
  };

  var QRMath={ glog:function(n){ if(n<1) throw new Error("glog("+n+")"); return QRMath.LOG_TABLE[n]; },
               gexp:function(n){ while(n<0) n+=255; while(n>=256) n-=255; return QRMath.EXP_TABLE[n]; },
               EXP_TABLE:new Array(256), LOG_TABLE:new Array(256) };
  for(var i=0;i<8;i++) QRMath.EXP_TABLE[i]=1<<i;
  for(var i=8;i<256;i++) QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];
  for(var i=0;i<255;i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;

  function QRPolynomial(num,shift){ if(num.length==undefined) throw new Error(num.length+"/"+shift);
    var off=0; while(off<num.length&&num[off]==0) off++; this.num=new Array(num.length-off+shift); for(var i=0;i<num.length-off;i++) this.num[i]=num[i+off];
  }
  QRPolynomial.prototype={
    get:function(i){return this.num[i];},
    getLength:function(){return this.num.length;},
    multiply:function(e){
      var num=new Array(this.getLength()+e.getLength()-1);
      for(var i=0;i<this.getLength();i++){
        for(var j=0;j<e.getLength();j++){
          num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num,0);
    },
    mod:function(e){ if(this.getLength()-e.getLength()<0) return this;
      var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0)), num=new Array(this.getLength());
      for(var i=0;i<this.getLength();i++) num[i]=this.get(i);
      for(var i=0;i<e.getLength();i++) num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);
      return new QRPolynomial(num,0).mod(e);
    }
  };

  function QRRSBlock(totalCount,dataCount){ this.totalCount=totalCount; this.dataCount=dataCount; }
  QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];
  QRRSBlock.getRSBlocks=function(t,e){ var rs=QRRSBlock.getRsBlockTable(t,e); if(!rs) throw new Error("bad rs block");
    var len=rs.length/3, list=[]; for(var i=0;i<len;i++){ var count=rs[i*3+0], total=rs[i*3+1], data=rs[i*3+2]; for(var j=0;j<count;j++) list.push(new QRRSBlock(total,data)); } return list;
  };
  QRRSBlock.getRsBlockTable=function(t,e){
    switch(e){ case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(t-1)*4+0];
               case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(t-1)*4+1];
               case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(t-1)*4+2];
               case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(t-1)*4+3];
               default: return undefined; }
  };

  function QRBitBuffer(){ this.buffer=[]; this.length=0; }
  QRBitBuffer.prototype={ get:function(i){ var b=Math.floor(i/8); return ((this.buffer[b]>>>(7-i%8))&1)==1; },
    put:function(num,len){ for(var i=0;i<len;i++) this.putBit(((num>>>(len-i-1))&1)==1); },
    getLengthInBits:function(){ return this.length; },
    putBit:function(bit){ var b=Math.floor(this.length/8); if(this.buffer.length<=b) this.buffer.push(0); if(bit) this.buffer[b]|=(0x80>>>(this.length%8)); this.length++; }
  };

  var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];

  function _getAndroid(){ var a=false,s=navigator.userAgent; if(/android/i.test(s)){ a=true; var m=s.toString().match(/android ([0-9]\.[0-9])/i); if(m&&m[1]) a=parseFloat(m[1]); } return a; }

  /* SVG renderer */
  var svgDrawer=(function(){
    var Drawing=function(el,opt){ this._el=el; this._opt=opt; };
    Drawing.prototype.draw=function(qr){
      var opt=this._opt, el=this._el, n=qr.getModuleCount();
      this.clear();
      function make(tag,attrs){ var e=document.createElementNS("http://www.w3.org/2000/svg",tag); for(var k in attrs) if(attrs.hasOwnProperty(k)) e.setAttribute(k,attrs[k]); return e; }
      var svg=make("svg",{ viewBox:`0 0 ${n} ${n}`, width:"100%", height:"100%", fill:opt.colorLight });
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink");
      el.appendChild(svg);
      svg.appendChild(make("rect",{ fill:opt.colorLight, width:"100%", height:"100%"}));
      svg.appendChild(make("rect",{ fill:opt.colorDark, width:"1", height:"1", id:"template"}));
      for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(qr.isDark(r,c)){ var u=make("use",{ x:String(c), y:String(r) }); u.setAttributeNS("http://www.w3.org/1999/xlink","href","#template"); svg.appendChild(u); }
    };
    Drawing.prototype.clear=function(){ while(this._el.firstChild) this._el.removeChild(this._el.firstChild); };
    return Drawing;
  })();

  var Drawing = svgDrawer;

  function _getTypeNumber(s,level){
    var type=1, len=_getUTF8Length(s);
    for(var i=0;i<=QRCodeLimitLength.length;i++){
      var limit=0;
      if(level==QRErrorCorrectLevel.L) limit=QRCodeLimitLength[i][0];
      else if(level==QRErrorCorrectLevel.M) limit=QRCodeLimitLength[i][1];
      else if(level==QRErrorCorrectLevel.Q) limit=QRCodeLimitLength[i][2];
      else if(level==QRErrorCorrectLevel.H) limit=QRCodeLimitLength[i][3];
      if(len<=limit) break; else type++;
    }
    if(type>QRCodeLimitLength.length) throw new Error("Too long data");
    return type;
  }
  function _getUTF8Length(s){ var rep=encodeURI(s).toString().replace(/\%[0-9a-fA-F]{2}/g,'a'); return rep.length + (rep.length!=s ? 3 : 0); }

  QRCode=function(el,opt){
    this._opt={ width:256, height:256, typeNumber:4, colorDark:"#000000", colorLight:"#ffffff", correctLevel:QRErrorCorrectLevel.H, useSVG:true };
    if(typeof opt==='string') opt={ text:opt };
    if(opt) for(var k in opt) this._opt[k]=opt[k];
    if(typeof el==="string") el=document.getElementById(el);
    this._android=_getAndroid(); this._el=el; this._qr=null; this._draw=new Drawing(this._el, this._opt);
    if(this._opt.text) this.makeCode(this._opt.text);
  };
  QRCode.prototype.makeCode=function(text){
    this._qr=new QRCodeModel(_getTypeNumber(text,this._opt.correctLevel), this._opt.correctLevel);
    this._qr.addData(text); this._qr.make(); this._el.title=text; this._draw.draw(this._qr);
  };
  QRCode.prototype.clear=function(){ this._draw.clear(); };
  QRCode.CorrectLevel=QRErrorCorrectLevel;
})();
/* ====== /QRCode LIB ====== */


/* ====== App helpers ====== */
const $ = (sel) => document.querySelector(sel);
function pad2(v){ return v<10 ? "0"+v : ""+v; }
function createFilename(){
  const t=new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth()+1)}-${pad2(t.getDate())}T${pad2(t.getHours())}-${pad2(t.getMinutes())}-${pad2(t.getSeconds())}-bulkqr.txt`;
}
function downloadList(){
  const blob=new Blob([$('#links').value],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=createFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function openFile(ev){
  const input=ev.target, reader=new FileReader();
  reader.onload=function(){ $("#links").value=reader.result; };
  if(input.files[0]) reader.readAsText(input.files[0]);
}
function getProtocol(url){ const parts=url.split(":"); return (parts.length===1) ? "" : parts[0].trim(); }
function parseMarkdownLink(line){
  const re=/\[([^\[]*)\]\((.*)\)/, m=line.match(re);
  if(!m||m.length!==3) return null;
  const proto=getProtocol(m[2]);
  return [m[1], m[2], proto];
}
function parseLine(line){
  if(line.trim()==="") return null;
  const mdl=parseMarkdownLink(line); if(mdl) return mdl;
  const proto=getProtocol(line);
  if(proto===""){
    let parts=line.split(/[^\\]\|/);
    parts[0]=parts[0].replace(/\\\|/g,"|").trim();
    let title=""; if(parts.length>1) title=parts[1].trim();
    return [title, parts[0], "text"];
  }
  const parts=line.split("|");
  const url=parts[0].trim();
  const title=(parts.length>1) ? parts[1].trim() : "";
  return [title, url, proto || "text"];
}

/* ====== Generate codes ====== */
function generateCodes(){
  const parent=$("#codes");
  parent.textContent="";

  const fg=$("#fgcolor").value.toString();
  const bg=$("#bgcolor").value.toString();
  const size=parseInt($("#size").value,10)||150;

  const lines=$("#links").value.split("\n");
  if(lines.length>1000){ alert("Nije moguće generisati više od 1000 kodova po pozivu."); return false; }

  if(lines.length){
    $("#generate").textContent="Ažuriraj QR kodove";
    $("#print").style.display="inline-flex";
  }

  let counter=1;
  for(const raw of lines){
    if(!raw.trim()) continue;
    const parts=parseLine(raw);
    const err=(parts==null);

    const card=document.createElement("div");
    card.className="code";

    if(err){
      card.innerHTML=`<div class="meta">Nije validan unos.</div>`;
      parent.appendChild(card);
      counter++; continue;
    }

    const payload=parts[1];
    const proto=parts[2];

    const holder=document.createElement("div");
    holder.className="qr";
    holder.id=`qr_${counter}`;
    holder.style.width=`${size}px`;
    holder.style.height=`${size}px`;
    card.appendChild(holder);

    const meta=document.createElement("div");
    meta.className="meta";
    meta.innerHTML = (proto!=="text") ? `<<a href="${payload}" target="_blank" rel="noopener">${payload}</a>` : `${payload}`;
    card.appendChild(meta);

    parent.appendChild(card);

    new QRCode(holder.id,{
      text: raw,
      width: size,
      height: size,
      colorDark: fg,
      colorLight: bg,
      correctLevel: QRCode.CorrectLevel.H,
      useSVG: true
    });

    counter++;
  }
  return false;
}

/* ====== Print presets & META height ====== */
function setPrintPreset(val){
  const b=document.body;
  b.classList.remove("p-a4p-2","p-a4p-3","p-a4p-4","p-a4l-5","p-a4-label-100x70","p-a4-label-70x45","p-70x100-1","p-45x70-1","p-custom");
  b.classList.add(val);
}

const presetDefaultLabel = {
  'p-a4p-3':10,'p-a4p-2':12,'p-a4p-4':8,'p-a4l-5':8,
  'p-a4-label-100x70':10,'p-a4-label-70x45':8,'p-custom':10,
  'p-70x100-1':10,'p-45x70-1':8
};

function setMetaHeight(mm){
  const v = Math.max(0, Math.min(30, Number(mm)||0));
  document.documentElement.style.setProperty('--label', v + 'mm');
}
function syncMetaInput(){
  const cur = getComputedStyle(document.documentElement).getPropertyValue('--label').trim();
  const num = parseFloat(cur);
  const inp = document.getElementById('metaHeight');
  if (inp && !isNaN(num)) inp.value = Math.round(num);
}

/* ====== Wire up events ====== */
document.addEventListener('DOMContentLoaded', ()=>{
  // default preset
  setPrintPreset($('#printPreset')?.value || 'p-a4p-3');
  // default label
  setMetaHeight($('#metaHeight')?.value || 10);
  syncMetaInput();

  // Kontrola visine META (text ispod QR)
  const metaHeightInput = document.getElementById("metaHeight");
  if (metaHeightInput){
    metaHeightInput.addEventListener("input", () => {
      document.documentElement.style.setProperty("--label", metaHeightInput.value + "mm");
    });
  }

  function applyMetaHeight(){
    const el=document.getElementById("metaHeight");
    if(!el) return;
    const v=(parseFloat(el.value)||0)+"mm";
    document.documentElement.style.setProperty("--label", v);
    document.body.style.setProperty("--label", v);
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    const inp=document.getElementById("metaHeight");
    if(inp){
      applyMetaHeight();
      inp.addEventListener("input", applyMetaHeight);
      inp.addEventListener("change", applyMetaHeight);
    }
    const reapply=()=>{ applyMetaHeight(); void document.body.offsetHeight; };
    window.addEventListener("beforeprint", reapply);
    const mq=window.matchMedia("print");
    if(mq&&mq.addEventListener){ mq.addEventListener("change", e=>{ if(e.matches) reapply(); }); }
  });

  // actions
  $('#generate').addEventListener('click', generateCodes);
  $('#print').addEventListener('click', ()=> window.print());
  $('#downloadListBtn').addEventListener('click', downloadList);
  $('#upload').addEventListener('change', openFile);
  $('#printPreset').addEventListener('change', (e)=>{
    setPrintPreset(e.target.value);
    if (presetDefaultLabel[e.target.value]!=null) setMetaHeight(presetDefaultLabel[e.target.value]);
    syncMetaInput();
  });
  $('#metaHeight').addEventListener('input', (e)=> setMetaHeight(e.target.value));
});

var time = new Date();
var year = time.getFullYear();
document.getElementById("year").innerHTML = year;