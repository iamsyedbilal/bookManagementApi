
// Health controller
export const healthCheck=(req,res)=>{
    return res.status(200).json({ success:true, "message": "Book Management API is running"})
}
