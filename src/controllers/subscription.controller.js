import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  const isSubscribed = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!isSubscribed) {
    const subscribe = await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });

    if (!subscribe) {
      throw new ApiError(500, "Internal error while subscribing");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subscribe, "Subscribed Successfully"));
  }

  const unSubscribe = await Subscription.findByIdAndDelete(isSubscribed._id);

  if (!unSubscribe) {
    throw new ApiError(500, "Internal error while unbscribing");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, unSubscribe, "Unsubscribed Successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
        $facet: {
          subscribersList: [
            {
              $project: {
                "subscribers.username": 1,
                "subscribers.fullName": 1,
                "subscribers.avatar": 1,
              },
            },
          ],
          totalCount: [
            {
              $count: "subscribersCount",
            },
          ],
        },
      },
  ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));

});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
      },
    },
    {
      $addFields: {
        channelsCount: {
          $size: "$channels",
        },
      },
    },
    {
      $project: {
        "channels.username": 1,
        "channels.fullName": 1,
        "channels.avatar": 1,
        channelsCount: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribedChannels, "Subscribed Channels fetched successfully"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
