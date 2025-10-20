import React, { useState } from 'react';
import styles from './LeaderboardPage.module.css';
import { Trophy, Award, Medal } from 'lucide-react';
import clsx from 'clsx';
import Navbar from './Navbar';
import Avatar from './Avatar';
import { ReactComponent as ColouredFlame } from "../assets/ColouredFlame.svg"
import { ReactComponent as RankIcon } from "../assets/RankIcon.svg"
import { ReactComponent as RankGold } from "../assets/Rank-Gold.svg"

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('ranking');

  // Sample leaderboard data
  const leaderboardData = [
    { rank: 1, initials: "RS", name: 'Rohan Sali', NFstreak: '28', DTstreak: '20', globalRank: '206', highlight: true },
    { rank: 2, initials: "U2", name: 'User 2', NFstreak: '23', DTstreak: '23', globalRank: '203' },
    { rank: 3, initials: "U3", name: 'User 3', NFstreak: '20', DTstreak: '10', globalRank: '20' },
    { rank: 4, initials: "U4", name: 'User 4', NFstreak: '20', DTstreak: '10', globalRank: '20' },
    { rank: 5, initials: "U5", name: 'User 5', NFstreak: '20', DTstreak: '10', globalRank: '20' },
    { rank: 6, initials: "U6", name: 'User 6', NFstreak: '20', DTstreak: '10', globalRank: '20' },
    { rank: 7, initials: "U7", name: 'User 7', NFstreak: '20', DTstreak: '10', globalRank: '20' },
    { rank: 8, initials: "U8", name: 'User 8', NFstreak: '20', DTstreak: '10', globalRank: '20' },
  ];

  return (
    <div className={styles["leaderboard-page"]}>
      <Navbar
        pageName="Leaderboard"
        Icon={RankIcon}
        buttons={[
          { label: "Ranking", variant: "primary", route: "/leaderboard" },
          { label: "My Routine", variant: "secondary", route: "/routine" },
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
        ]}
      />
      
      {/* Main Content */}
      <div className={styles["main-content"]}>
        {/* User Stats Card */}
        <div className={styles["user-stats-card"]}>
          <div className={styles["user-avatar"]}>
            <Avatar initials="RS" size='medium'/>
            <div className={styles["user-name"]}>Rohan Sali</div>
          </div>
          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Current Month</div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>No Fap : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>0 Days</div>
            </div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>Daily Task : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>0 Days</div>
            </div>
          </div>
          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Best</div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>No Fap : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>0 Days</div>
            </div>
            <div className={styles["stat-value-group"]}>
              <div className={styles["stat-value"]}>Daily Task : </div>
              <ColouredFlame className={styles["flame"]}/>
              <div className={styles["stat-subvalue"]}>0 Days</div>
            </div>
          </div>
          <div className={styles["stat-item"]}>
            <div className={styles["stat-label"]}>Rank</div>
            <div className={styles["stat-subvalue"]}>1st in Gold</div>
            <div className={styles["stat-subvalue"]}>200<sup>th</sup> Global</div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className={styles["leaderboard-card"]}>
          <div className={styles["leaderboard-header"]}>
            <h2>Leaderboard</h2>
            <RankGold style={{height : "50px" }} />
          </div>

          <div className={styles["leaderboard-list"]}>
            {/* Top 3 with special styling */}
            {leaderboardData.slice(0, 3).map((user) => (
              <div 
                key={user.rank} 
                className={clsx(
                  styles["leaderboard-item"],
                  user.highlight && styles["highlight"],
                  styles[`rank${user.rank}`]
                )}
              >
                <div className={styles["rank-section"]}>
                  <div className={styles["rank-number"]}>
                    {user.rank === 1 && '1st'}
                    {user.rank === 2 && '2nd'}
                    {user.rank === 3 && '3rd'}
                  </div>
                </div>
                <div className={styles["user-section"]}>
                  <Avatar size={55} initials={user.initials} className={styles['usersAvatar']} />
                  <span className={styles["user-name-text"]}>{user.name}</span>
                </div>
                <div className={styles["stats-section"]}>
                  <div className={styles["streak"]}>NF: <span className={styles["streak-value"]}>{user.NFstreak}</span></div>
                  <div className={styles["streak"]}>DT: <span className={styles["streak-value"]}>{user.DTstreak}</span></div>
                  <div className={styles["gblrank"]}>GR: <span className={styles["gblrank-value"]}>{user.globalRank}</span></div>
                </div>
              </div>
            ))}

            {/* Rest of the rankings */}
            {leaderboardData.slice(3).map((user) => (
              <div key={user.rank} className={styles["leaderboard-item"]}>
                <div className={styles["rank-section"]}>
                  <div className={styles["rank-number-plain"]}>{user.rank}</div>
                </div>
                <div className={styles["user-section"]}>
                  <Avatar size={40} initials={user.initials} className={clsx(styles['usersAvatar'],styles["small"])} />
                  <span className={styles["user-name-text"]}>{user.name}</span>
                </div>
                <div className={clsx(styles["stats-section"],styles["small"])}>
                  <div className={clsx(styles["streak"],styles["small"])}>NF: <span className={clsx(styles["streak-value"],styles["small"])}>{user.NFstreak}</span></div>
                  <div className={clsx(styles["streak"],styles["small"])}>DT: <span className={clsx(styles["streak-value"],styles["small"])}>{user.DTstreak}</span></div>
                  <div className={clsx(styles["gblrank"],styles["small"])}>GR: <span className={clsx(styles["gblrank-value"],styles["small"])}>{user.globalRank}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}