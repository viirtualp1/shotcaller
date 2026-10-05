# Steam achievements

Enter these in Steamworks under **Stats & Achievements → Achievements**, then publish. The API name must match
`src/application/steamAchievements.ts` exactly; once published, it never changes. Each achievement needs a square
JPG icon and a greyed version for the locked state, at the size the Steamworks page asks for.

The game reads every achievement from the coach's profile, so progress made on the web, in Discord or before Steam
unlocks them on first launch.

| API name                | English           | Russian              | How to earn it                                         |
| ----------------------- | ----------------- | -------------------- | ------------------------------------------------------ |
| `FIRST_WIN`             | First win         | Первая победа        | Win a match.                                           |
| `WINS_50`               | Fifty wins        | Пятьдесят побед      | Win 50 matches.                                        |
| `WIN_STREAK_5`          | On a roll         | Серия                | Win 5 matches in a row.                                |
| `CAREER_REGULAR`        | Finding your feet | Вошёл в игру         | Finish 5 matches.                                      |
| `CAREER_THRONE_BREAKER` | Throne breaker    | Разрушитель тронов   | Win 3 matches by destroying the enemy throne.          |
| `CAREER_EXPLORER`       | A broad roster    | Широкий ростер       | Field 10 different heroes across your career.          |
| `CAREER_STRATEGIST`     | Tactical range    | Тактический кругозор | Win with 4 different synergies across your career.     |
| `CAREER_THREE_STAR`     | Three stars       | Три звезды           | Field a three-star hero in combat.                     |
| `TRIAL_SIEGE`           | Throne assault    | Штурм трона          | Clear the Throne assault trial.                        |
| `TRIAL_SYNERGY`         | Better together   | Сила связок          | Clear the Better together trial.                       |
| `TRIAL_ARSENAL`         | Full arsenal      | Полный арсенал       | Clear the Full arsenal trial.                          |
| `TRIAL_THREE_FRONTS`    | Three fronts      | Три фронта           | Clear the Three fronts trial.                          |
| `LEVEL_10`              | Seasoned coach    | Опытный тренер       | Reach coach level 10.                                  |
| `LEVEL_25`              | Veteran coach     | Тренер-ветеран       | Reach coach level 25.                                  |
| `RANK_STRATEGIST`       | Strategist        | Стратег              | Reach the Strategist rank in ranked matches (600 MMR). |
| `RANK_SHOTCALLER`       | The Shotcaller    | Шотколлер            | Reach the top rank, The Shotcaller (1200 MMR).         |

Until The Shotcaller has its own Steam app, the desktop game runs as Spacewar (app 480), Valve's test app. Spacewar has
its own achievements, so these names unlock nothing there; they start working once the app ID in `electron/steam.ts`
is changed and the list above is published.
