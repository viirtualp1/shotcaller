-- Taking back Fight in a duel.
-- A coach who sent their board can take it back while the other coach has not sent theirs, and plan on. Once both
-- boards are in, the round is fought and nothing can be taken back: the other coach never sees a board that was
-- withdrawn, since a board stays hidden until both sides have sent one.

-- True when the board was taken back; false when the other side's board is in and the round goes ahead.
create function public.withdraw_board(duel uuid, board_round integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.duels;
  my_side smallint;
begin
  select * into game from public.duels where id = duel for update;

  my_side := case when game.host = auth.uid() then 0 when game.guest = auth.uid() then 1 end;

  if my_side is null then
    raise exception 'Not your duel' using errcode = '42501';
  end if;

  if game.status <> 'active' then
    raise exception 'The duel is over' using errcode = 'P0410';
  end if;

  -- Both boards of that round are in when the round has moved on past it.
  if board_round <> game.round or public.duel_board_sent(duel, board_round, (1 - my_side)::smallint) then
    return false;
  end if;

  delete from public.duel_boards b where b.duel_id = duel and b.round = board_round and b.side = my_side;

  if my_side = 0 then
    update public.duels set host_board_round = least(host_board_round, board_round - 1) where id = duel;
  else
    update public.duels set guest_board_round = least(guest_board_round, board_round - 1) where id = duel;
  end if;

  return true;
end;
$$;

revoke execute on function public.withdraw_board(uuid, integer) from public, anon;
grant execute on function public.withdraw_board(uuid, integer) to authenticated;
