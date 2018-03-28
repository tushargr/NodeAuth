//for some url request if we have to go to another file (like- stylesheet.css) then the it creates a new request and whole thing get executed for it.

var http=require('http');
var fs=require('fs');
var querystring=require('querystring');
var path=require('path');
var url=require('url');
var formidable=require('formidable');
var jade=require('jade');
var MongoClient=require('mongodb').MongoClient;
var dburl="mongodb://127.0.0.1:27017/";
var uniqid=require('uniqid'); //used for creating sessions
var bcrypt=require('bcrypt-nodejs');



MongoClient.connect(dburl,function(error,db){
	if(error) console.log(error);
	else{
		var dbase=db.db("nodeauth");
		dbase.createCollection("users",function(err,res){
			if(err) console.log(err);
			
		});
		dbase.createCollection("sessions",function(err,res){
			if(err)console.log(err);
		})
	}
});

const mimeTypes={
	"html": "text/html",
	"jpg": "image/jpg",
	"jpeg": "image/jpeg",
	"js": "text/javascript",
	"css": "text/css",
	"ico": "image/ico",
	"png": "image/png",
	"woff":"font/woff",
	"gif":"image/gif",
		
}

var server=http.createServer(function(req,res){
	var uri=req.url;
	var filepath=url.parse(uri).pathname;
	var filepathLocal=path.join(process.cwd(),unescape(filepath));
	var stats;
	console.log(uri);
	
	if((filepath=="/register")&&(req.method.toLowerCase()=='post')){
		var form_fields=[];
		var form_files=[];
		var form =new formidable.IncomingForm();
		form.parse(req);
    	form.on('file', function(name, file) {
        	form_files.push([file.name,file.path]);
    	});
    	form.on('field', function(name, field) {
        	form_fields.push(field);
    	});
    	form.on('end',function(){
    		
    		var search;
    		MongoClient.connect(dburl,function(err,db){
    			if (err) console.log(err);
    			var dbase=db.db("nodeauth");
    			dbase.collection("users").find({email:form_fields[2]}).toArray(function(error,result){
    				if(error) console.log(error);
    				var errors=[];
    				if(result.length!=0){
    					errors.push("User already exists");
    				}

    				//form validation
					else{
						if(form_fields[0]=="") errors.push("First Name is required");
						if(form_fields[1]=="") errors.push("Last Name is required");
						if(form_fields[2]=="") errors.push("Email is required");
						if(form_fields[3]=="") errors.push("Password is required");
						else if(form_fields[4]!=(form_fields[3])) errors.push("Both Passwords must match");
					}
					if(errors.length>0){
						res.writeHead(200,{'Content-Type':'text/html'});
						jade.renderFile('index.jade',{errors:errors},function(error,html){
							if(error) console.log("There is some error converting jade to html");
							else{
					 			fs.writeFile('./index.html',html,function(err){
					 				var readstream=fs.createReadStream('./index.html');
					 				readstream.pipe(res);
					 			});
					 		}
						});
					}
					else{
						var temp_path = form_files[0][1];
		        		var file_name = form_files[0][0];
		        		
		        		if(file_name!=""){
		        			fs.rename(temp_path,"./uploads/"+file_name,function(err){
		        				if(err) console.log("error moving file");
		        			});
		        		}
		        		else{
		        			file_name="noimage.png";
		        		}

		        		var file_path="./uploads/"+file_name;
		        		var hash=bcrypt.hashSync(form_fields[3]);
		        		dbase.collection("users").insertOne({firstname:form_fields[0],lastname:form_fields[1],email:form_fields[2],password:hash,profileimage:file_path},function(er,res){
		        			if(er) console.log(er);
		        			else {console.log("new user added to database:nodeauth")};
		        		});	
		        		//session on
		        		var id=uniqid();
		        		dbase.collection("sessions").insertOne({email:form_fields[2],session_id:id},function(er,res){
		        			if(er)console.log(er);
		        		});
		        		//direct to members site with cookie //if user log out from one machine he dont get logged out form all devices
		        		res.writeHead(200,{'Content-Type':'text/html','Set-Cookie':id});
						jade.renderFile('members.jade',{profileimage:file_path},function(error,html){
							if(error) console.log("There is some error converting jade to html");
							else{
					 			fs.writeFile('./members.html',html,function(err){
					 				var readstream=fs.createReadStream('./members.html');
					 				readstream.pipe(res);
					 			});
					 		}
						});
    				}
    			});	
    		});	
		});	
    }
	


	else if((filepath=="/login") && (req.method.toLowerCase()=="post")){

		var form_fields2=[];
		var form2 =new formidable.IncomingForm();
		form2.parse(req);
    	form2.on('field', function(name, field) {
        	form_fields2.push(field);
    	});
		form2.on('end',function(){
			MongoClient.connect(dburl,function(error,db){
				if(error) console.log(error);
				var dbase=db.db("nodeauth");
				dbase.collection("users").find({email:form_fields2[0]}).toArray(function(err,result){
					var errors=[];
					
					if((result.length==0)||(!(bcrypt.compareSync(form_fields2[1],(result[0])['password'] )))) {
						errors.push("Invalid email or password");
						res.writeHead(200,{'Content-Type':'text/html'});
						jade.renderFile('login.jade',{errors:errors},function(errr,html){
							if(errr) console.log("There is some error converting jade to html");
							else{
					 			fs.writeFile('./login.html',html,function(e){
					 				var readstream=fs.createReadStream('./login.html');
					 				readstream.pipe(res);
					 			});
					 		}
						});
					}
					else{
						//session on
						var id=uniqid();
		        		dbase.collection("sessions").insertOne({email:form_fields2[0],session_id:id},function(er,res){
		        			if(er)console.log(er);
		        		});

						res.writeHead(200,{'Content-Type':'text/html','Set-Cookie':id});
						jade.renderFile('members.jade',{profileimage:((result[0])['profileimage'])},function(error,html){
							if(error) console.log("There is some error converting jade to html");
							else{
					 			fs.writeFile('./members.html',html,function(err){
					 				var readstream=fs.createReadStream('./members.html');
					 				readstream.pipe(res);
					 			});
					 		}
						});
					}
				});
			});
		});
	}

	else if(filepath=="/logout"){
		//session off 
		var id;
		try{id=req.headers.cookie;}
		catch(e){id="";}
		MongoClient.connect(dburl,function(error,db){
			var dbase=db.db("nodeauth");
			dbase.collection("sessions").deleteOne({session_id:id},function(err,obj){
				if(err) console.log(err);
			});
		});
		res.writeHead(200,{'Content-Type':'text/html'});
		jade.renderFile('login.jade',{message:"you have successfully logged out"},function(errr,html){
			if(errr) console.log("There is some error converting jade to html");
			else{
				fs.writeFile('./login.html',html,function(e){
					var readstream=fs.createReadStream('./login.html');
					readstream.pipe(res);
	 			});
	 		}
		});
	}





	else if(req.method.toLowerCase()=='get'){

		try{
			stats=fs.lstatSync(filepathLocal);
		}
		catch(e){
			console.log("There is some error in get");
			res.writeHead(404,{'Content-Type':'text/plain'});
			res.write("404 File Not Found");
			res.end();
			return;
		}

		if(stats.isFile()){
			var id;
			try{id=req.headers.cookie;}
			catch(e){id="";}
			

			MongoClient.connect(dburl,function(error,db){
				var dbase=db.db("nodeauth");
				
				dbase.collection("sessions").find({session_id:id}).toArray(function(err,result){
					if((result.length==1)&&((filepath=="/login.html")||(filepath=="/members.html"))){
						dbase.collection("users").find({email:(result[0])['email']}).toArray(function(er,reslt){
							res.writeHead(200,{'Content-Type':'text/html'});
							jade.renderFile('members.jade',{profileimage:((reslt[0])['profileimage'])},function(errr,html){
								if(errr) console.log("There is some error converting jade to html");
								else{
					 				fs.writeFile('./members.html',html,function(e){
					 					var readstream=fs.createReadStream('./members.html');
					 					readstream.pipe(res);
					 				});
					 			}
							});
						});
					}
					else{
						if(filepath=="/members.html"){
							res.writeHead(302,{'Location':'./login.html'});
							res.end();
						}
						else{
							var mimeType=mimeTypes[path.extname(filepath).split(".").reverse()[0]];
							filepath="."+filepath;
							if(mimeType.split("/").reverse()[0]=="html"){
								var jadefilepath=filepath.replace('html','jade');
								res.writeHead(200,{'Content-Type':mimeType});
				
								jade.renderFile(jadefilepath,function(err,html){
									if(err){console.log("there is error converting jade to html file");}
									else{	
										fs.writeFile(filepath,html,function(error){
											var readstream=fs.createReadStream(filepath);
											readstream.pipe(res);		
										});
									}		
								});
							}
							else{
								res.writeHead(200,{'Content-Type':mimeType});
								var readstream=fs.createReadStream(filepath);
								readstream.pipe(res);
							}
						}
					}
				});
			});
				
		}
		else if(stats.isDirectory()){
			var newfilepath="."+filepath;
			newfilepath=path.join(newfilepath,"index.html");
			res.writeHead(302,{'Location':newfilepath});
			res.end();
		}
		else{
			res.writeHead(500,{'Content-Type':'text/plain'});
			res.write("500 Internal Error");
			res.end();
		}
			

	}
	
}).listen(8080);