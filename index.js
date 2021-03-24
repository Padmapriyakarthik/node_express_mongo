require('dotenv').config();

const express=require('express');
const app=express();

app.use(express.json());

const mongodb=require('mongodb');
const mongoClient=mongodb.MongoClient;
const objectId=mongodb.ObjectID;

const dbUrl=process.env.DB_URL || "mongodb://127.0.0.1:27017";
const port=process.env.PORT || 4000;

app.get("/student",async (req,res)=>{
try{
    let client=await mongoClient.connect(dbUrl);
    let db=client.db("Student_Mentor");
    let data=await db.collection("student").find().toArray();
    res.status(200).json(data);
    client.close();
}
catch(error)
{
    console.log(error);
}
});

app.get("/mentor",async (req,res)=>{
    try{
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let data=await db.collection("mentor").find().toArray();
        res.status(200).json(data);
        client.close();
    }
    catch(error)
    {
        console.log(error);
    }
    });

app.post("/student",async (req,res)=>{
    try{
        let user_available=false;
        let message="";
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let data=await db.collection("student").find({}).project({"student_email":1,"_id":0}).toArray();
        data.map((elem)=>{
            if(elem.student_email==req.body.student_email)
            {
                user_available=true;
                message="student already present";
            }
        });
        if(!user_available)
        {
            await db.collection("student").insertOne(req.body);
            message="student created"
        }
        res.status(200).json({message});
        client.close();
    }
    catch(error)
    {
        console.log(error);
    }
});

app.post("/mentor",async (req,res)=>{

    try{
        let user_available=false;
        let message="";
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let data=await db.collection("mentor").find({}).project({"mentor_email":1,"_id":0}).toArray();
        for(i=0;i<data.length;i++)
        {
            if(data[i].mentor_email==req.body.mentor_email)
            {
                user_available=true;
                message="mentor already present";
                break;
            }
        }        
        if(!user_available)
        {
            await db.collection("mentor").insertOne(req.body);
            message="mentor created"
        }
           
            res.status(200).json({message});
            client.close();
        }
        catch(error)
        {
            console.log(error);
        }
});


//API to assign or change Mentor
app.put("/student/:id",async (req,res)=>{
    try{
        let message="";
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let student_id=await db.collection("student").find({"_id":objectId(req.params.id)}).toArray();

        let mentor_id=await db.collection("mentor").find({"_id":objectId(req.body.mentor_id)}).project({"_id":1}).toArray();
        if(student_id.length>0)
        {
            mentor=await db.collection("student").find({"_id":objectId(req.params.id)}).project({"_id":0,"student_mentor_id":1}).toArray();
           if(mentor[0].student_mentor_id)
            {
                let list=await db.collection("mentor").find({"_id":objectId(mentor[0].student_mentor_id)}).project({"mentor_studetlist":1,"_id":0}).toArray();
                index=list[0].mentor_studetlist.indexOf(objectId(req.params.id));
                list[0].mentor_studetlist.splice(index,1);
                await db.collection("mentor").findOneAndUpdate({"_id":objectId(mentor[0].student_mentor_id)},{$set:{"mentor_studetlist":list[0].mentor_studetlist}});
            }
            if(mentor_id.length>0)
            {
                await db.collection("student").findOneAndUpdate({"_id":objectId(req.params.id)},{$set:{"student_mentor_id":req.body.mentor_id}});
                message="student assigned with mentor";

                let list=await db.collection("mentor").find({"_id":objectId(req.body.mentor_id)}).project({"mentor_studetlist":1,"_id":0}).toArray();
                let new_list=[...list[0].mentor_studetlist];
                new_list.push(objectId(req.params.id));
                await db.collection("mentor").findOneAndUpdate({"_id":objectId(req.body.mentor_id)},{$set:{"mentor_studetlist":new_list}});
            }
            else{
                message="Mentor not available";
            }
        }
        else{
            message="Student not available";
        }
        res.status(200).json({message});
        client.close();
    }
    catch(error){
        console.log(error);
    }
   
});


//API to show all students for a particular mentor
app.get("/mentor/:id/student-list",async(req,res)=>{
   try{    
        let list1=[];
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let mentor_id=await db.collection("mentor").find({"_id":objectId(req.params.id)}).toArray();
        if(mentor_id.length>0)
        {  
            let list=await db.collection("mentor").find({"_id":objectId(req.params.id)}).project({"mentor_studetlist":1,"_id":0}).toArray();
           
            for(i=0;i<list[0].mentor_studetlist.length;i++)
            {
                let elem=list[0].mentor_studetlist[i];
                let  l=await db.collection("student").find({"_id":objectId(elem)}).toArray();
               list1.push(l);
            }
        }
        else{
            list1=["no student is assigned"];
        }
        res.status(200).send(list1);
        client.close();
    }
    catch(error)
    {
        console.log(error);
    }

});


//API to assign multiple student for single mentor
app.put("/mentor/:id/assign-student",async(req,res)=>{

    try{
        let message="";
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let mentor_id=await db.collection("mentor").find({"_id":objectId(req.params.id)}).toArray();
        if(mentor_id.length>0)
        {
                let elem=[...req.body.student_id];
                console.log(elem);
                for(i=0;i<elem.length;i++)
                {
                mentor=await db.collection("student").find({"_id":objectId(elem[i])}).project({"_id":0,"student_mentor_id":1}).toArray();
                if(!mentor[0].student_mentor_id)
                {
                    console.log("inside id");
                    await db.collection("student").findOneAndUpdate({"_id":objectId(elem[i])},{$set:{"student_mentor_id":objectId(req.params.id)}});   
                    console.log('done');
                let list=await db.collection("mentor").find({"_id":objectId(req.params.id)}).project({"mentor_studetlist":1,"_id":0}).toArray();
                let new_list=[...list[0].mentor_studetlist];
                new_list.push(objectId(elem[i]));
                await db.collection("mentor").findOneAndUpdate({"_id":objectId(req.params.id)},{$set:{"mentor_studetlist":new_list}});
                message="mentor Assigned with student";
                }
               
            }
            message="mentor Assigned with student";
        }
        else{
            message="mentor not available";
        }
        client.close();
        res.status(200).send(message);
    }
    catch(error){
        console.log(error);
    }
})

//API to delete particular mentor
app.delete("/mentor/:id",async(req,res)=>{
    try{
        let message="";
        let client=await mongoClient.connect(dbUrl);
        let db=client.db("Student_Mentor");
        let mentor_id=await db.collection("mentor").find({"_id":objectId(req.params.id)}).toArray();
        if(mentor_id.length>0)
        {
            let std_list=await db.collection("mentor").find({"_id":objectId(req.params.id)}).project({"mentor_studetlist":1,"_id":0}).toArray();
            let list=[...std_list[0].mentor_studetlist];
            if(list.length>0)
            {
                for(i=0;i<list.length;i++)
                {
                    await db.collection("student").findOneAndUpdate({"_id":objectId(list[i])},{$set:{"student_mentor_id":""}});
                }
            }
            await db.collection("mentor").deleteOne({"_id":objectId(req.params.id)});
            message="Mentor deleted";
        }
        else{

            message="Mentor not available";
        }
        client.close();
        res.status(200).send(message);
    }
    catch(error){
        console.log(error);
    }

})

app.listen(port,()=>{console.log("port started")});