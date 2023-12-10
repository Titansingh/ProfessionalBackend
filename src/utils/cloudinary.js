import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";



cloudinary.config({ 
  cloud_name: 'dhw20ajab',                      // all shoulod be placed in .env
  api_key: '192457189289571', 
  api_secret: 'xVvo08ydRLloHGNJa1hX-ghHjBg' 
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response= await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //file has been uploaded sucessfull
        console.log("file is uploaded on cloudinary",response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);//remove the locally saved temp file as the upload opreation is failed
        return null;
    }
}

export {uploadOnCloudinary}