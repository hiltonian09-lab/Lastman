import { describe, it, expect } from "vitest";
import { pickOutcome } from "../pick-outcome";

describe("pickOutcome", () => {
  const fixture = {
    home_team_id: "home",
    away_team_id: "away",
    home_score: 2,
    away_score: 1,
  };

  it("returns win when the picked team scores more", () => {
    expect(
      pickOutcome({ ...fixture, team_id: fixture.home_team_id }),
    ).toBe("win");
  });

  it("returns loss when the picked team scores fewer", () => {
    expect(
      pickOutcome({ ...fixture, team_id: fixture.away_team_id }),
    ).toBe("loss");
  });

  it("returns draw when scores are equal", () => {
    expect(
      pickOutcome({
        ...fixture,
        home_score: 1,
        away_score: 1,
        team_id: fixture.home_team_id,
      }),
    ).toBe("draw");
  });

  it("returns loss when scores are missing", () => {
    expect(
      pickOutcome({
        ...fixture,
        home_score: null,
        away_score: null,
        team_id: fixture.home_team_id,
      }),
    ).toBe("loss");
  });
});
