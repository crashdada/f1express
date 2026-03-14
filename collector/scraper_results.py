#!/usr/bin/env python3
"""
F1 Race Results Scraper — 赛后成绩采集框架

功能：
  - 检测赛后窗口（比赛结束后 1-3 天自动触发）
  - 从 F1 官网采集比赛成绩
  - 输出结构化 JSON，供 syncer.py 同步到展示端

用法：
  python scraper_results.py                  # 自动检测窗口
  python scraper_results.py --force           # 强制采集最近一场
  python scraper_results.py --round 3         # 采集指定轮次

URL 格式（2025+ 赛季）：
  https://www.formula1.com/en/results/{year}/races/{raceId}/{slug}/race-result
  其中 raceId 为 F1 官网内部编号，需从 results 列表页面动态获取。
"""

import json
import os
import re
import sys
import datetime
import argparse
import requests

# 复用 scraper.py 的核心能力
from scraper import F1DataCollector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_schedule_file(season):
    return os.path.join(SCRIPT_DIR, 'data', f'schedule_{season}.json')

def get_results_dir(season):
    return os.path.join(SCRIPT_DIR, f'results_{season}')

def load_schedule(season):
    """加载赛历"""
    schedule_file = get_schedule_file(season)
    if not os.path.exists(schedule_file):
        print(f'[!] 赛历不存在: {schedule_file}')
        return []
    with open(schedule_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def find_recent_race(schedule, season):
    """找到最近结束的比赛（距离比赛结束已超过 3 小时，且不超过 3 天）"""
    # 这里我们统一使用 UTC 时间进行比较，因为 GitHub Action 运行在 UTC 环境
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    
    for race in schedule:
        if race.get('isTest', False):
            continue

        # 尝试从 sessions 中获取 RACE 的时间
        race_session = None
        for sess in race.get('sessions', []):
            if sess.get('name', '').upper() == 'RACE':
                race_session = sess
                break
        
        if not race_session or not race_session.get('time'):
            continue
            
        try:
            # 解析比赛时间 (例如: '2026-03-15T05:00:00Z')
            # 使用 fromisoformat 可以解析带 Z 结尾的 UTC 时间（需替换为 +00:00）
            time_str = race_session['time'].replace('Z', '+00:00')
            race_time_utc = datetime.datetime.fromisoformat(time_str)
            
            # 通常 F1 比赛时长约为 1.5 到 2 小时
            # 假设给定的 session.time 是比赛开始时间，则比赛结束时间约在开始后 2 小时
            # 我们要确保在比赛结束后的 3 小时执行，所以是比赛开始后的 5 小时
            target_scrape_time = race_time_utc + datetime.timedelta(hours=5)
            
            # 宽限期：如果在设定的触发时间之后，且不超过 3 天
            delta = now_utc - target_scrape_time
            if datetime.timedelta(0) <= delta <= datetime.timedelta(days=3):
                return race
        except Exception as e:
            print(f"解析时间出错: {e}")
            continue

    return None


def find_race_by_round(schedule, round_num):
    """按轮次查找比赛"""
    for race in schedule:
        round_text = race.get('round', '')
        match = re.search(r'(\d+)', round_text)
        if match and int(match.group(1)) == round_num:
            return race
    return None


def discover_race_urls(collector):
    """
    从 F1 官网 results 列表页面获取所有已出结果的比赛 URL。
    返回 { slug: full_url } 映射。

    URL 格式: /en/results/{year}/races/{raceId}/{slug}/race-result
    """
    listing_url = f"{collector.base_url}/en/results/{collector.season}/races"
    print(f'   发现比赛URL: {listing_url}')

    html = collector.fetch_page(listing_url, max_retries=2, initial_delay=30)
    if not html:
        print('   [!] 无法获取 results 列表页面')
        return {}

    # 从 HTML 中提取所有 race-result 链接
    # 格式: /en/results/2026/races/1279/australia/race-result
    pattern = r'/en/results/\d+/races/(\d+)/([\w-]+)/race-result'
    matches = re.findall(pattern, html)

    race_urls = {}
    for race_id, slug in matches:
        full_url = f"{collector.base_url}/en/results/{collector.season}/races/{race_id}/{slug}/race-result"
        race_urls[slug] = full_url
        print(f'   发现: {slug} -> raceId={race_id}')

    if not race_urls:
        print('   [!] 未找到任何比赛链接（赛季可能尚未开始）')

    return race_urls


def scrape_race_results(collector, race, race_urls=None):
    """
    采集单场比赛成绩

    先通过 discover_race_urls 获取正确的 URL（含 raceId），
    若未找到则回退到不含 raceId 的旧格式。
    """
    slug = race.get('slug', '')
    country = race.get('country', race.get('location', 'unknown'))
    round_text = race.get('round', '')

    # 确定结果页 URL
    if race_urls and slug in race_urls:
        result_url = race_urls[slug]
    else:
        # 回退到旧格式（可能 404）
        result_url = f"{collector.base_url}/en/results/{collector.season}/races/{slug}/race-result"
        print(f'   [⚠] 未在列表中找到 {slug}，使用回退 URL')

    print(f'\n🏎️  采集: {country} ({round_text})')
    print(f'   URL: {result_url}')

    # 获取页面 HTML
    html = collector.fetch_page(result_url, max_retries=2, initial_delay=60)
    if not html:
        print(f'   [!] 页面获取失败')
        return None

    # 解析成绩（直接传入已有 HTML，避免二次 fetch）
    results = collector.get_race_results(html)
    if not results:
        print(f'   [!] 未找到成绩数据（页面结构可能已变化）')
        return None

    # 构造输出
    output = {
        'round': round_text,
        'country': country,
        'slug': slug,
        'url': result_url,
        'scraped_at': datetime.datetime.now().isoformat(),
        'results': results
    }

    # 尝试获取杆位信息 (Starting Grid)
    grid_url = result_url.replace('/race-result', '/starting-grid')
    print(f'   起步距阵 URL: {grid_url}')
    grid_html = collector.fetch_page(grid_url, max_retries=1, initial_delay=5)
    if grid_html:
        pole_info = collector.get_starting_grid(grid_html)
        if pole_info:
            output['polePosition'] = pole_info
            print(f"   拿到杆位: 车号 {pole_info['no']} 成绩 {pole_info['time']}")
        else:
            print("   [!] 未能解析杆位信息")
    else:
        print("   [!] 获取 Starting Grid 失败，无杆位数据")

    print(f'   ✅ 获取到 {len(results)} 条成绩')
    return output


def save_results(data, race, season):
    """保存采集结果"""
    results_dir = get_results_dir(season)
    os.makedirs(results_dir, exist_ok=True)

    slug = race.get('slug', 'unknown')
    filename = f'{slug}_results.json'
    filepath = os.path.join(results_dir, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f'   💾 保存至 {filepath}')
    return filepath


def main():
    parser = argparse.ArgumentParser(description='F1 赛后成绩采集')
    parser.add_argument('--force', action='store_true',
                        help='强制采集最近一场（忽略窗口检测）')
    parser.add_argument('--round', type=int,
                        help='采集指定轮次的成绩')
    parser.add_argument('--season', type=int, default=datetime.datetime.now().year,
                        help='指定赛季年份')
    args = parser.parse_args()

    print('=' * 50)
    print(f'F1 {args.season} Results Scraper')
    print('=' * 50)

    season = args.season
    schedule = load_schedule(season)
    if not schedule:
        sys.exit(1)

    collector = F1DataCollector(season=season)

    # 确定目标比赛
    if args.round:
        race = find_race_by_round(schedule, args.round)
        if not race:
            print(f'[!] 未找到第 {args.round} 轮比赛')
            sys.exit(1)
    elif args.force:
        # 取最近的非测试赛事
        races = [r for r in schedule if not r.get('isTest', False)]
        race = races[-1] if races else None
        if not race:
            print('[!] 赛历中无有效赛事')
            sys.exit(1)
    else:
        race = find_recent_race(schedule, season)
        if not race:
            print('今天不在赛后窗口内，无需采集。')
            print('使用 --force 或 --round N 强制执行。')
            sys.exit(0)

    # 发现比赛 URL（获取 raceId 映射）
    print('\n📡 从 F1 官网获取比赛列表...')
    race_urls = discover_race_urls(collector)

    # 采集
    results = scrape_race_results(collector, race, race_urls)
    if results:
        save_results(results, race, season)
        print('\n✅ 采集完成')
    else:
        print('\n❌ 采集失败')
        sys.exit(1)


if __name__ == '__main__':
    main()
