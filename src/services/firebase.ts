import { signInWithPopup } from "firebase/auth";
import { auth, db, provider } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { User } from "../types/user";

export const signupWithGoogle = async () => {
    try {
        const res = await signInWithPopup(auth, provider);
        return res?.user || null;
    } catch (err) {
        console.error(err);
        return null;
    }
};


export const doesUsernameExists = async (username: string)=> {
    const user = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
    if(user.status === 200) {
        return user.json().then((res) => {
            console.log('Success',res)
            return res;
        });
    } else {
       console.log('APi limit crossed');
    }
};



export async function getUserByUserId(userId: string) {
    const q = query(collection(db, "users"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const user = querySnapshot.docs.map((item) => ({
        ...item.data(),
        docId: item.id,
    }));

    return user;    
}

export const getContestCount = async (username: string) => {
    const res = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
    if (res.status === 200) {
        const data = await res.json();
        if (data.status === "OK") {
            return data.result.length; 
        }
    }
    return 0; 
};


export const getSolvedCount = async (username: string) => {
  const res = await fetch(`https://codeforces.com/api/user.status?handle=${username}`);
  if (res.status === 200) {
    const data = await res.json();
    if (data.status === "OK") {
      const solvedSet = new Set();
        
      for (const submission of data.result) {
        if (submission.verdict === "OK") {
          const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
          solvedSet.add(problemId);
        }
      }

      return {solved:solvedSet.size,attempt:data.result.length};
    }
  }
  return 0;
};


export const getRatingGraph = async (username: string)=>{
    const res=await fetch(`https://codeforces.com/api/user.rating?handle=${username}`)
    if (res.status===200){
        const data=await res.json()
        const ratings=data.result
        const ans =[]
        for (const rating of ratings){
                ans.push(rating.newRating)
        }
        return ans
    }
    return []
}


export async function getAllUsers() {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const users = usersSnapshot.docs.map((doc) => ({
    ...doc.data(),
    docId: doc.id,
  }));
  return users;
}

// services/firebase.ts (or services/codeforces.ts if separate)

export async function getProblemsByTags(username: string) {
  const res = await fetch(`https://codeforces.com/api/user.status?handle=${username}`);
  const data = await res.json();
  if (data.status !== 'OK') return {};

  const solvedTags: Record<string, number> = {};

  data.result.forEach((submission: any) => {
    if (submission.verdict === 'OK') {
      submission.problem.tags.forEach((tag: string) => {
        solvedTags[tag] = (solvedTags[tag] || 0) + 1;
      });
    }
  });

  // Sort by highest solved first
  const sorted = Object.fromEntries(
    Object.entries(solvedTags).sort((a, b) => b[1] - a[1])
  );

  return sorted;
}


export async function getProblemsByDifficulty(username: string) {
  const res = await fetch(`https://codeforces.com/api/user.status?handle=${username}`);
  const data = await res.json();
  if (data.status !== 'OK') return {};

  const difficultyBuckets: Record<string, number> = {
    "<800": 0,
    "800-1200": 0,
    "1200-1600": 0,
    "1600-2000": 0,
    "2000+": 0
  };

  data.result.forEach((submission: any) => {
    if (submission.verdict === 'OK' && submission.problem.rating) {
      const r = submission.problem.rating;
      if (r < 800) difficultyBuckets["<800"]++;
      else if (r < 1200) difficultyBuckets["800-1200"]++;
      else if (r < 1600) difficultyBuckets["1200-1600"]++;
      else if (r < 2000) difficultyBuckets["1600-2000"]++;
      else difficultyBuckets["2000+"]++;
    }
  });

  return difficultyBuckets;
}


export async function getContestHistory(username: string) {
  const res = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
  const data = await res.json();
  if (data.status !== 'OK') return [];

  const contests = data.result.map((c: any) => ({
    contestName: c.contestName,
    gain: c.newRating - c.oldRating,
    newRating: c.newRating,
    rank: c.rank,
  }));

  return contests;
}
