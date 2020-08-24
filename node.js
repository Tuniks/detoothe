class Node {
	constructor(vertices, color, daddy, amount, texture, showColor){
		this.vertices = vertices.slice();
		if(color == null)
			this.color = new THREE.Color( Math.random(), Math.random(), Math.random());
		else
			this.color = color;
		this.noChildren = true;
		this.children = [null, null];
		this.daddy = daddy;
		this.mesh = null;
		if(amount == null)
			this.amount = 10;
		else
			this.amount = amount;
		if(texture == null)
			this.textureFile = null;
		else
			this.textureFile = texture;
		this.showColor = showColor;
	}

	draw(scene){
		if(!this.noChildren){
        	scene.remove(this.mesh);
			this.children[0].draw(scene);
			this.children[1].draw(scene);
		} else {
			//console.log(this.mesh);
			var verticeslist = [];
			
			scene.remove(this.mesh)
			for(var i=0; i <= this.vertices.length; i++){
				var j = i%this.vertices.length;
				verticeslist.push(new THREE.Vector2(this.vertices[j][0], this.vertices[j][1]));
			}
			
			var polygonShape = new THREE.Shape(verticeslist);
			

			var extrudeSettings = {
				steps: 2,
				amount: -this.amount,
				bevelEnabled: false};
			var prism = new THREE.ExtrudeGeometry(polygonShape, extrudeSettings);
			
			if(this.textureFile){
				var loader = new THREE.TextureLoader();
				var texture = loader.load(this.textureFile);
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				texture.offset.set( options.offsetx, options.offsety);
				texture.repeat.set( options.repeatx, options.repeaty);
				if(this.showColor)
					var material = new THREE.MeshLambertMaterial( { map:texture , side:THREE.DoubleSide, color:this.color} );
				else
					var material = new THREE.MeshLambertMaterial( { map:texture , side:THREE.DoubleSide} );	
			} else 
				var material = new THREE.MeshLambertMaterial( { color: this.color, side:THREE.DoubleSide} );
			
			this.mesh = new THREE.Mesh( prism, material ) ;
			scene.add( this.mesh );
		}
	}

	changeAmount(object, i){
		if (this.mesh == object){
			this.amount += i;
			if(this.amount < 10){
				this.amount = 10;
			}
		}
		else if(!this.noChildren){
			this.children[0].changeAmount(object, i);
			this.children[1].changeAmount(object, i);
		}
	}


	changeTexture(object, filename){
		if(this.mesh == object){
			if(this.textureFile == filename)
				this.textureFile = null;
			else
				this.textureFile = filename;
		}
		else if(!this.noChildren){
			this.children[0].changeTexture(object, filename);
			this.children[1].changeTexture(object, filename);
		}
	}

	toggleColor(object){
		if(this.mesh == object){
			this.showColor = !this.showColor;
		}
		else if(!this.noChildren){
			this.children[0].toggleColor(object);
			this.children[1].toggleColor(object);
		}
	}

	checkIfInside(point, vertices){
		//baseado em https://github.com/substack/point-in-polygon
		var x = point.x;
		var y = point.y;
		var inside = false;

		for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++){
			var xi = vertices[i][0];
			var yi = vertices[i][1];
			var xj = vertices[j][0];
			var yj = vertices[j][1];

			if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
				inside = !inside;
		}

		return inside;
	}

	checkIfDividing(start, end){
		if ((this.checkIfInside(start, this.vertices)) && (this.checkIfInside(end, this.vertices)) && (this.noChildren)){
			this.createChildren(start, end);
		} else if  ((this.checkIfInside(start, this.vertices)) && (this.checkIfInside(end, this.vertices)) && (!this.noChildren)){
			if(this.children[0] != null)
				this.children[0].checkIfDividing(start, end);
			if(this.children[1] != null)
				this.children[1].checkIfDividing(start, end);
		} else if ((this.checkIfInside(start, this.vertices)) || (this.checkIfInside(end, this.vertices))){
			this.fraternalMurderSuicide();
		}
	}

	createChildren(start, end){
		this.noChildren = false;

		var newStart = new THREE.Vector2(0,0);
		var newEnd = new THREE.Vector2(0,0);
		var auxStart = new THREE.Vector2(0,0);
		var auxEnd = new THREE.Vector2(0,0);
		var interPoint;
		var verticesLeft = [];
		var verticesRight = [];
		var mod;

		//geting y = ax+b
		if(end.x - start.x == 0)
			end.x += 0.00001;
		var a = (end.y - start.y) / (end.x - start.x);
		var b = end.y - a * end.x;
		//expanding line segment to the screen limits for covenience sake
		newStart.x = -1;
		newStart.y = -a + b;
		newEnd.x = width + 1;
		newEnd.y = a * (width+1) + b;

		//testing if line segments intersect and getting those points
		for(var i = 0; i < this.vertices.length; i++){
			auxStart.x = this.vertices[i][0];
			auxStart.y = this.vertices[i][1];
			mod = (i+1)%this.vertices.length;
			auxEnd.x = this.vertices[mod][0];
			auxEnd.y = this.vertices[mod][1];

			if(this.intersectionExists(newStart, newEnd, auxStart, auxEnd)){
				interPoint = this.intersectionPoint(newStart, newEnd, auxStart, auxEnd);
				verticesLeft.push([interPoint.x, interPoint.y]);
				verticesRight.push([interPoint.x, interPoint.y]);
			}

			if(this.relativePosition(newStart, newEnd, auxStart) >= 0)
				verticesLeft.push([auxStart.x, auxStart.y]);
			if(this.relativePosition(newStart, newEnd, auxStart) <= 0)
				verticesRight.push([auxStart.x, auxStart.y]);
		}

		this.arrangePoints(verticesLeft);
		this.arrangePoints(verticesRight);

		this.children[0] = new Node(verticesLeft, this.color, this, this.amount, this.textureFile, this.showColor);
		this.children[1] = new Node(verticesRight, null, this, this.amount, this.textureFile, this.showColor);
	}


	intersectionExists(startR, endR, startS, endS){
		//baseado em https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
		var det, gamma, lambda;
		det = (endR.x - startR.x) * (endS.y - startS.y) - (endS.x - startS.x) * (endR.y - startR.y);
		if(det == 0)
			return false;
		else{
			lambda = ((endS.y - startS.y) * (endS.x - startR.x)
						 + (startS.x - endS.x) * (endS.y - startR.y)) / det;
			gamma = ((startR.y - endR.y) * (endS.x - startR.x)
						 + (endR.x - startR.x) * (endS.y - startR.y)) / det;
			return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
		}
	}

	intersectionPoint(startR, endR, startS, endS){
		//y = ax + b
		if(endR.x - startR.x == 0)
			endR.x += 0.00001;
		var a = (endR.y - startR.y) / (endR.x - startR.x);
		var b = endR.y - a * endR.x;

		//y = cx + d
		if(endS.x - startS.x == 0)
			endS.x += 0.00001;
		var c = (endS.y - startS.y) / (endS.x - startS.x);
		var d = endS.y - c * endS.x;

		var r = new THREE.Vector2((d-b)/(a-c),(a*d - b*c)/(a - c));
		return r;
	}

	arrangePoints(vertices){
		var xc = 0, yc = 0, aux;

		for(var i=0; i < vertices.length; i++){
			xc += vertices[i][0];
			yc += vertices[i][1];
		}
		xc =  xc/vertices.length;
		yc = yc/vertices.length;

		for(i=0; i< vertices.length; i++){
			aux = Math.atan2(vertices[i][1] - yc, vertices[i][0] - xc);
			vertices[i].push(aux);
		}

		vertices.sort(function(a,b){
			return a[2] - b[2]
		});

		for(i=0; i< vertices.length; i++){
			vertices[i] = vertices[i].slice(0,2);
		}
	}

	//0 on the line, and +1 on one side, -1 on the other side
	relativePosition(start, end, point){
		return Math.sign((end.x - start.x)*(point.y - start.y) - (end.y - start.y)*(point.x - start.x));	
	}

	fraternalMurderSuicide(){
		var papi = this.daddy;
		if(papi != null){
			papi.amount = this.amount;
			papi.children[0].removeMesh();
			papi.children[1].removeMesh();
			papi.children = [null, null];
			papi.noChildren = true;	
		}
	}

	removeMesh(){
		scene.remove(this.mesh)
		if(!this.noChildren){
			this.children[0].removeMesh();
			this.children[1].removeMesh();
		}
	}


}