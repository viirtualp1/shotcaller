import { BALANCE_FINGERPRINT, fnv1a } from './balance'
import { HEROES } from './heroes'
import { HERO_IDS, ITEM_IDS, MODE_IDS } from './ids'
import { ITEM_SELL_RATIO, ITEM_SLOTS, ITEMS, STASH_SIZE, RECIPES } from './items'
import { MODES } from './modes'
import { COPIES_PER_STAR, ECONOMY, MATCH, MERGE_COUNT, OPPONENT, POOL_COPIES, ROSTER } from './rules'

/**
 * Bump when a whole match can play out differently without any number below changing: income, round and match
 * judging, the shop, board checks, or the computer coach that plays on after a ghost's recording ends.
 * `tests/domain/matchRules.spec.ts` pins what this revision does and fails until it is bumped and repinned.
 */
const MATCH_LOGIC_REVISION = 3

/**
 * Everything a whole match reads on top of the fights in `BALANCE_FINGERPRINT`: gold, prices, levels, judging and
 * the computer coach. Online duels, ghosts and the arbiter use it, so two clients, or a client and the arbiter,
 * that would judge a board or a round differently never meet.
 */
function matchRulesData() {
  return {
    logic: MATCH_LOGIC_REVISION,
    battle: BALANCE_FINGERPRINT,
    economy: ECONOMY,
    roster: ROSTER,
    pool: POOL_COPIES,
    copiesPerStar: COPIES_PER_STAR,
    merge: MERGE_COUNT,
    match: MATCH,
    opponents: OPPONENT,
    heroes: HERO_IDS.map((id) => ({
      id,
      tier: HEROES[id].tier,
      copies: HEROES[id].copies ?? null,
    })),
    items: ITEM_IDS.map((id) => ({
      id,
      cost: ITEMS[id].cost,
    })),
    recipes: RECIPES,
    itemSlots: ITEM_SLOTS,
    stash: STASH_SIZE,
    itemSellRatio: ITEM_SELL_RATIO,
    modes: MODE_IDS.map((id) => MODES[id]),
  }
}

/** The rules of a whole match. Fits the 32 characters the server keeps for a duel's rules. */
export const MATCH_RULES_FINGERPRINT = fnv1a(JSON.stringify(matchRulesData()))
