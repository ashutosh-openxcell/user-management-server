import User from "../models/user.js";


export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const searchQuery = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const totalUsers = await User.countDocuments(searchQuery);
    
    const users = await User.find(searchQuery)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .select("-password -refreshToken");

    res.json({
      users,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (error) {
    res.status(500).json({message: "Error fetching users"});
  }
};

export const getUserById = async ( req, res) => {
    const id = req.params.id;
    try {
       const user = await User.findById(id);

       if (!user) {
        return res.status(404).json({ message: "User not found" });
       }

       res.json(user);
    } catch (error) {
      res.status(500).json({message: "Error fetching user"});
    }
};

export const getProfile = async (req, res) => {
    try{
        const user = await User.findById(req.user.id).select("-password -refreshToken");
        res.json(user);
    } catch(error){
        res.status(500).json({message: "Error fetching user"});
    }
}

export const editUser = async (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    try {
        const user = await User.findById(id);

        if(!user){
           return res.status(404).json({ message: "User not found" });
        }
        if (name) user.name = name;

        await user.save();

        res.json({
            message: "User updated successfully",
            user,
        });
    } catch (error) {
        console.log("error", error);
        res.status(500).json({message: "Error updating user"});
    }    
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
    });
  }
};

export const updateUserStatus = async (req, res) => {
  const { status } = req.body;
  if (req.user.id === req.params.id) {
    return res.status(400).json({
      message: "You cannot change your own status",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating status",
    });
  }
};