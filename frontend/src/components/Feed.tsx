import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import LoadingSpinner from "./loading-spinner";
import TweetCard from "./TweetCard";
import TweetComposer from "./TweetComposer";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { showTweetNotification, tweetMatchesNotificationKeywords } from "@/lib/notifications";

const POLL_INTERVAL_MS = 20000;

const Feed = () => {
  const { user } = useAuth();
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);
  // Feature 1: track which tweet ids we've already considered for notifications,
  // so we only notify about genuinely NEW tweets, not ones we've already seen.
  const seenIds = useRef<Set<string> | null>(null);

  const fetchTweets = async (isInitial = false) => {
    try {
      if (isInitial) setloading(true);
      const res = await axiosInstance.get("/post");
      const fetched: any[] = res.data || [];

      if (seenIds.current === null) {
        // First load: just remember what's there, don't notify retroactively.
        seenIds.current = new Set(fetched.map((t) => t._id));
      } else {
        const newOnes = fetched.filter((t) => !seenIds.current!.has(t._id));
        for (const tweet of newOnes) {
          seenIds.current.add(tweet._id);
          if (
            user?.notificationsEnabled &&
            tweet.author?._id !== user._id &&
            tweetMatchesNotificationKeywords(tweet.content)
          ) {
            showTweetNotification(tweet);
          }
        }
      }

      setTweets(fetched);
    } catch (error) {
      console.error(error);
    } finally {
      if (isInitial) setloading(false);
    }
  };

  useEffect(() => {
    fetchTweets(true);
    const interval = setInterval(() => fetchTweets(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.notificationsEnabled]);

  const handlenewtweet = (newtweet: any) => {
    seenIds.current?.add(newtweet._id);
    setTweets((prev: any) => [newtweet, ...prev]);
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">Home</h1>
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-gray-800 rounded-none h-auto">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              For you
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handlenewtweet} />
      <div className="divide-y divide-gray-800">
        {loading ? (
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400 mb-4">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p>Loading tweets...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          tweets.map((tweet: any) => <TweetCard key={tweet._id} tweet={tweet} />)
        )}
      </div>
    </div>
  );
};

export default Feed;
