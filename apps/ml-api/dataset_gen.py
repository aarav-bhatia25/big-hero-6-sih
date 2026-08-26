import os
import argparse
import numpy as np  
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_dataset(output_path: str, num_normal: int = 9500, num_anomalies: int = 500):
    print(f"Generating dataset ({num_normal} normal + {num_anomalies} anomalous records)...")
    
    # Synthetic trek baseline generation if static file is absent
    static_file = os.path.join(BASE_DIR, 'data', 'trekking_dataset.csv')
    if os.path.exists(static_file):
        static_treks = pd.read_csv(static_file)
    else:
        # Generate synthetic trek records dynamically
        static_treks = pd.DataFrame({
            'Trek_Name': [f'Trek_{i}' for i in range(1, 101)],
            'Difficulty': np.random.choice(['Easy', 'Moderate', 'Difficult', 'Hard'], size=100),
            'Difficulty_Score': np.random.choice([1.0, 2.0, 3.0, 4.0], size=100),
            'Max_Altitude_m': np.random.uniform(1500, 4500, size=100)
        })

    normal_tourists = static_treks.sample(n=num_normal, replace=True).reset_index(drop=True)
    normal_tourists['Hour_of_Day'] = np.random.randint(6, 18, size=num_normal)
    normal_tourists['Distance_From_Trail_km'] = np.random.uniform(0.0, 3.0, size=num_normal)
    normal_tourists['Bad_Weather_Flag'] = np.random.choice([0, 1], size=num_normal, p=[0.9, 0.1])

    anomalous_tourists = static_treks.sample(n=num_anomalies, replace=True).reset_index(drop=True)
    anomalous_tourists['Hour_of_Day'] = np.random.choice([19, 20, 21, 22, 23, 0, 1, 2, 3, 4], size=num_anomalies)
    anomalous_tourists['Distance_From_Trail_km'] = np.random.uniform(8.0, 20.0, size=num_anomalies)
    anomalous_tourists['Bad_Weather_Flag'] = np.random.choice([0, 1], size=num_anomalies, p=[0.2, 0.8])

    final_dataset = pd.concat([normal_tourists, anomalous_tourists], ignore_index=True)
    final_dataset = final_dataset.sample(frac=1).reset_index(drop=True)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    final_dataset.to_csv(output_path, index=False)
    print(f"Dataset generated successfully and saved to: '{output_path}'")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate ML Training Dataset")
    parser.add_argument('--out', default=os.path.join(BASE_DIR, 'data', 'processed_training_data.csv'))
    parser.add_argument('--normal', type=int, default=9500)
    parser.add_argument('--anomalies', type=int, default=500)
    args = parser.parse_args()

    generate_dataset(args.out, args.normal, args.anomalies)
