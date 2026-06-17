from math import floor


ENEMY_BUDGETS = {
    "lurker": 1.0,
    "skitter": 0.75,
    "brute": 3.2,
    "swarming": 0.45,
    "broodcarrier": 2.4,
}


def stage_wave_growth_scale(stage_index):
    scales = [0.72, 0.78, 0.84, 0.9, 0.94, 0.97]
    if stage_index < 0:
        return scales[0]
    if stage_index < len(scales):
        return scales[stage_index]
    return 1.0


def stage_enemy_mix(stage_index):
    skitter_start = [6, 2, 2, 2, 2, 1, 1, 1, 1, 1]
    brute_start = [99, 8, 4, 4, 4, 3, 3, 2, 2, 2]
    swarming_start = [99, 99, 99, 8, 5, 5, 4, 3, 3, 2]
    broodcarrier_start = [99, 99, 99, 99, 7, 6, 5, 4, 4, 3]
    index = max(0, min(stage_index, len(skitter_start) - 1))
    return {
        "skitter_start": skitter_start[index],
        "brute_start": brute_start[index],
        "swarming_start": swarming_start[index],
        "broodcarrier_start": broodcarrier_start[index],
        "boss_enabled": stage_index >= 3,
    }


def generate_stage_waves(stage_index=0, total_waves=8):
    """Orbit Bastion의 간결한 웨이브 데이터를 생성합니다.

    Pyodide는 결정적인 데이터 전용 웨이브 생성을 위해 이 함수를 호출합니다.
    실시간 스폰과 전투 시뮬레이션은 JavaScript가 담당합니다.
    """
    waves = []
    growth_scale = stage_wave_growth_scale(stage_index)
    mix = stage_enemy_mix(stage_index)
    for wave in range(1, total_waves + 1):
        if wave == 1:
            waves.append({"wave": wave, "groups": [{"type": "lurker", "count": 6 + max(0, stage_index - 2), "gap": 0.82}], "reward": 18 + wave * 4})
            continue
        effective_wave = 1 + (wave - 1) * growth_scale
        budget = 5 + stage_index * 2.5 + effective_wave * 2.4
        groups = []

        lurkers = max(3, floor(budget / 1.8))
        groups.append({"type": "lurker", "count": lurkers, "gap": max(0.6, 0.96 - wave * 0.032)})

        if wave >= mix["skitter_start"]:
            skitters = floor((budget * 0.36) / ENEMY_BUDGETS["skitter"])
            groups.append({"type": "skitter", "count": skitters, "gap": 0.5})

        if wave >= mix["brute_start"]:
            brutes = max(1, floor((budget * 0.18) / ENEMY_BUDGETS["brute"]))
            groups.append({"type": "brute", "count": brutes, "gap": 1.2})

        if wave >= mix["swarming_start"]:
            swarmings = floor((budget * 0.5) / ENEMY_BUDGETS["swarming"])
            groups.append({"type": "swarming", "count": swarmings, "gap": 0.26})

        if wave >= mix["broodcarrier_start"]:
            broodcarriers = max(1, floor((budget * 0.15) / ENEMY_BUDGETS["broodcarrier"]))
            groups.append({"type": "broodcarrier", "count": broodcarriers, "gap": 0.95})

        if mix["boss_enabled"] and wave == total_waves:
            groups.append({"type": "colossus", "count": 1, "gap": 0.15})

        waves.append({"wave": wave, "groups": groups, "reward": 18 + wave * 4})
    return waves
