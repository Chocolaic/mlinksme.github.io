var loader={};
var label=$("label"), 
	res=$("#resource"),
	progress=$("progress"),
	onhandle=false;

$("#Btd").click(function(){
	var textId=$("#Box").val().match(/\d+/);
	if(!textId)
		alert("请输入ID");
	else if(onhandle)
		alert("请耐心等待操作完成..");
	else{
		msg("进行下载...");
		loader.ajax(textId[0]);
	}
});

loader.init=function(){
	progress.hide();
	var urlId=window.location.href.match(/\d+/);
	if(urlId){
		msg("进行下载...");
		loader.ajax(urlId);
	}
}

loader.handleStatic=function(data){
	msg("努力下载中...");
	var imgList=data.result.info.urls;
	progress.show();
	for(var i=0;i<imgList.length;i++){
		var path=imgList[i].original.match(/img-original.+/);
		partImage = document.createElement('img');
		partImage.src="https://www.nullcat.cn/api/pixiv/proxy?path="+path;
		res.append(partImage);
		progress.val((i+1)/imgList.length);
	}
	progress.hide();
	msg("#右键图片保存#");
	onhandle=false;
}

loader.ajax=function(zid){
	onhandle=true;
	$.ajax({
		url: "https://www.nullcat.cn/api/pixiv/info",
		dataType: "json",
		async: true,
		type: "GET",
		data: {'zid' : zid },
		success: function(data){
			if(!data.error){
				res.empty();
				var type=data.result.illustType;
				if(type==2)
					loader.handleAnime(data);
				else
					loader.handleStatic(data);
			}else{
				switch(data.message){
					case 400:
						msg("Id不正确.");break;
					case 404:
						msg("作品不存在或受屏蔽限制.");break;
					default:
						msg(data.message);break;
				}
				onhandle=false;
			}
		},
		error:function(){
			msg("请求远程资源失败");
			onhandle=false;
		}
	});
}

loader.handleAnime=function(data){
	msg("努力下载中...");
	var param=data.result.info.originalSrc.match(/img-zip-ugoira.+/),
		frames=data.result.info.frames,
		type=data.result.info.mime_type,
		size= data.result.info.Resolution;
	JSZipUtils.getBinaryContent("https://www.nullcat.cn/api/pixiv/proxy?path="+param, function(err, compress){
		if(err)
			return false;
		var zip = new JSZip(compress);
		function concatImage(){
			var gif=new GIF({
				workers: 2,
				quality: 10,
				width: size[0],
				height: size[1],
				debug: true,
				workerScript: 'script/gif.worker.js'
			});
			for(var i=0;i<frames.length;i++){
				console.log(frames[i].file);
				var str = "data:"+type+";base64,"+BufferToBase64(zip.file(frames[i].file).asArrayBuffer()),
					frameImage = new Image();
				frameImage.src = str;
				gif.addFrame(frameImage, {delay: frames[i].delay });
			}
			msg("正在操作文件...");
			progress.show();
			gif.on('progress', function(p){
				progress.val(p);
			});
			gif.on('finished', function(blob, _data){
				console.log("finished");
				animatedImage = document.createElement('img');
				animatedImage.src=loader.buildDataURL(_data);
				msg("#右键图片保存#");
				res.attr("href", URL.createObjectURL(blob));
				res.append(animatedImage);
				progress.val(0);
				progress.hide();
			});
			return gif.render();
		}
		try{
			return concatImage();
		}catch(err){
			msg("中断了？刷新页面试试");
			return false;
		}finally{
			onhandle=false;
		}
	});
}

loader.buildDataURL = (function() {
  var charMap, i, j;
  charMap = {};
  for (i = j = 0; j < 256; i = ++j) {
    charMap[i] = String.fromCharCode(i);
  }
  return function(data) {
    var k, ref3, str;
    str = '';
    for (i = k = 0, ref3 = data.length; 0 <= ref3 ? k < ref3 : k > ref3; i = 0 <= ref3 ? ++k : --k) {
      str += charMap[data[i]];
    }
    return 'data:image/gif;base64,' + btoa(str);
  };
})();

function msg(content){
	label.text(content);
}

function BufferToBase64(buffer){
	var binary = '', bytes = new Uint8Array(buffer);
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++){
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

window.onload=loader.init;