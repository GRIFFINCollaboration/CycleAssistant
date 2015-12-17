//g++ decay_program.C `root-config --cflags --libs` -o DecayProgram
#include "TMatrixD.h"
#include "TVectorD.h"
#include "TMath.h"
#include "TMatrixDEigen.h"
#include "TCanvas.h"
#include "TAxis.h"
#include "TGraph.h"
#include "TMultiGraph.h"
#include "TLegend.h"
#include "TFrame.h"
#include <vector>
#include <algorithm>
#include <iostream>

using namespace std;

int main()
{
	/* --------------------------------------------------------------
	|	Input section						|
	-------------------------------------------------------------- */

	int n; // how many isotopes to track
	cout <<"How many isotopes to track?" <<endl;
	cin >> n;
	//cout <<"You want to track " <<n <<" isotopes." <<endl;

	double halflife,br;
	int daughter;
	TMatrixD Lambda(n,n); // decay rate matrix
	TVectorD Implant(n); // implantation rate vector
	TVectorD Orig(n); // original population of nuclei
	TVectorD Bold(n); // should the line be bold?
	double beamontime,beamofftime,timestep; // time variables
	vector<string> names; // names of the isotopes to track
	string tempname; // temporary string for input
	bool logscale; // should you use log scale or not?
	double scalefactor; // determines time scale for final plots
	
	for (int i=0;i<n;i++)
	{
		cin.get();
		// Isotope names
		cout <<"Isotope " <<i+1 <<" (name/label):";
		std::getline(std::cin,tempname);
		cout <<tempname <<endl;
		names.push_back(tempname);

		// initialize intensity vector (units: particles/s)
		Implant[i] = 0; // default value
		cout <<"What is the implantation rate for " <<names[i].c_str() <<" in particles/second?" <<endl;
		cin >> Implant[i];
	//	cout <<"It is " <<Implant[i] <<endl;
		
		// initialize original population vector (units: number of nuclei)
		cout <<"How many " <<names[i].c_str() <<" were on the tape at time t=0?" <<endl;
		cin >> Orig[i];
	//	cout <<"There were " <<Orig[i] <<" nuclei." <<endl;

		// initialize half-life
		cout <<"What is the half-life of " <<names[i].c_str() <<" (in seconds)?" <<endl;
		cin >> halflife;
		cout <<"Half-life " <<i <<" is: " <<halflife <<endl;
		Lambda[i][i] = - TMath::Log(2)/halflife;
	//	cout <<"The half-life is " <<HalfLife[i][2] <<" seconds." <<endl;

		// check to see if there are daughter isotopes
		string line;
		cout <<"Would you like to monitor the decay products?" <<endl;
		cout <<"\"y\" for yes, \"n\" for no." <<endl;
		cin >> line;

		while (line=="y" || line=="Y")
		{
			// declare daughter isotope index
			cout <<"What is the index of the daughter nucleus of " <<names[i].c_str() <<"?" <<endl;
		//	cout <<"(Type \"0\" if you don't want to track the daughter nucleus.)" <<endl;
			cin >> daughter;
			cout <<"Daughter nucleus index: " <<daughter <<endl;

			// check answer and offer second chance
			while (daughter == i+1)
			{
				cout <<"Have a Dum-Dum - your input just said that " <<names[i].c_str() <<" decays to itself." <<endl;
				cout <<"I suppose that could be true, but please give that state of " <<names[i].c_str() <<" as another nucleus to track." <<endl;
				cout <<"Try again." <<endl;
				cout <<"What is the INDEX of the daughter nucleus of " <<names[i].c_str() <<"?" <<endl;
				cout <<"(Type \"0\" if you don't want to track any daughter nuclei.)" <<endl;
				cin >> daughter;
			}

			// check for branching ratio
			cout <<"What is the branching ratio for that decay?" <<endl;
			cin >> br;
			cout <<"BR: " <<br <<endl;
			// then assign off-diagonal elements
			// -1 in the indices because the HalfLife mother and daughter indices start at zero
			Lambda[daughter-1][i] = TMath::Log(2)/halflife*br;
	//		cout <<"Assigned the decay of isotope " <<i <<" to isotope " <<daughter-1 <<" with a BR of " <<br <<" to a decay rate of " <<Lambda[daughter-1][i] <<endl;

			cout <<"Are there more branches from " <<names[i].c_str() <<"?" <<endl;
			cout <<"\"y\" for yes, \"n\" for no." <<endl;
			cin >> line;
		}
		
		cout <<"Make lines in plot bold?" <<endl;
		cin >> line;
		if (line=="y" || line=="Y") { Bold[i] = 1;}
		else { Bold[i] = 0;}
	}

	cout <<"How long was the beam on (in seconds)?" <<endl;
	cin >> beamontime;
	cout <<"Beam will be on for " <<beamontime <<" seconds." <<endl;
	cout <<"How long was the beam off (in seconds)?" <<endl;
	cin >> beamofftime;
	cout <<"Beam will be off for " <<beamofftime <<" seconds." <<endl;
	cout <<"What should the time step be (in seconds)?" <<endl;
	cin >> timestep;
	cout <<"Log scale? 1 for yes, 0 for no." <<endl;
	cin >> logscale;
	cout <<"What time units would you like for the final plots? (s, ns, ms, min, hr)" <<endl;
	cin >> tempname;
	if (tempname=="s") scalefactor = 1;
	else if (tempname=="ns") scalefactor = 0.000000001;
	else if (tempname=="ms") scalefactor = 0.001;
	else if (tempname=="min") scalefactor = 60;
	else if (tempname=="hr") scalefactor = 3600;
	else
	{
		scalefactor = 1;
		cout <<"I didn't understand you, so I'm setting it to seconds." <<endl;
	}
	cout <<"Scale factor is: " <<scalefactor <<endl;

	// -------------------------------------------------------------//
	//	Calculation section					//
	// -------------------------------------------------------------//

	TMatrixDEigen EigenMatrix(Lambda); // eigenmatrix
	TVectorD EigenVal = EigenMatrix.GetEigenValuesRe(); // eigenvalue vector
	TMatrixD EigenVec = EigenMatrix.GetEigenVectors(); // matrix of eigenvectors (columns)
	TMatrixD EigenVecInv = EigenVec;
	double det; // determinant variable
	EigenVecInv.Invert(&det);

	// invert matrix Lambda
	TMatrixD LambdaInv = Lambda;
	LambdaInv.Invert(&det);

	// Nstar vector = - LambdaInv * Implant
	TVectorD Nstar = Implant;
	Nstar*=-1;
	Nstar*=LambdaInv;

	// calculate maxindex for the time steps
	double mintime = 0; // in seconds
	double maxtime = beamontime+beamofftime; // total time (in seconds)
	int maxindex = int((maxtime-mintime)/timestep);

	// set-up e^Lambda matrix
	TMatrixD ELambda(n,n);

	// set-up diagonal matrix;
	TMatrixD Diag(n,n);

	// set-up matrix to store N_i(t) values
	// row index: isotope index
	// column index: time step index
	TMatrixD N(n,maxindex+1);
	TVectorD NatT(n);

	// set-up graphs for each isotope
	TGraph* NumGraphs[n];
	TGraph* ActGraphs[n];
	for (int i=0;i<n;i++)
	{
		NumGraphs[i] = new TGraph(maxindex+1);
		ActGraphs[i] = new TGraph(maxindex+1);
	}

	bool BeamOn = kTRUE;
	// establish e^Lambda matrix
	for (int i=0;i<=maxindex;i++)
	{
		double t = i*timestep + mintime; // time for this step.

		if (t>beamontime && BeamOn)
		{
			BeamOn = kFALSE;
			Nstar = 0;
			Orig = NatT;
			cout <<"Turned beam off!" <<endl;
		}

		// assign values to diagonal matrix
		// only diagonal elements with values of the eigenvalues * time
		for (int j=0;j<n;j++)
		{	
			Diag[j][j] = TMath::Exp(t*EigenVal[j]);
			if (!BeamOn) Diag[j][j] = TMath::Exp((t-beamontime)*EigenVal[j]);
		}

		// ELambda = EigenVec*Diag*EigenVecInv
		ELambda = EigenVec*Diag;
		ELambda*=EigenVecInv;

		// N(t) = ELambda*(Orig-Nstar)+Nstar
		NatT = Orig-Nstar;
		NatT*=ELambda;
		NatT+=Nstar;

		// assign vector to columns of matrix N
		for (int j=0;j<n;j++)
		{
			N[j][i] = NatT[j];
			// divide by scalefactor so time units are correct.
			NumGraphs[j]->SetPoint(i,t/scalefactor,N[j][i]);
			ActGraphs[j]->SetPoint(i,t/scalefactor,-1*Lambda[j][j]*scalefactor*N[j][i]);
		}
	}

	// -------------------------------------------------------------//
	//	Display and formatting section				//
	// -------------------------------------------------------------//

	// calculate integrals of ActGraphs
	double integrals[n];
	for (int i=0;i<n;i++)
	{
		double x,y;
		integrals[i]=0;
		for (int j=0;j<ActGraphs[i]->GetN();j++)
		{
			ActGraphs[i]->GetPoint(j,x,y);
			integrals[i] = integrals[i] + y*timestep/scalefactor;
		}
		printf("integral %i: %f decays\n",i,integrals[i]);
	}

	// create multiNumGraphs 
	TMultiGraph* NumGraphstack = new TMultiGraph("NumGraphstack","Number of nuclei on tape");
	TMultiGraph* ActGraphstack = new TMultiGraph("ActGraphstack","Activity of nuclei on tape");
	for (int i=0;i<n;i++)
	{
		NumGraphs[i]->SetLineColor(i+1);
		NumGraphs[i]->SetTitle(names[i].c_str());
		NumGraphstack->Add(NumGraphs[i]);
		ActGraphs[i]->SetLineColor(i+1);
		ActGraphs[i]->SetTitle(names[i].c_str());
		ActGraphstack->Add(ActGraphs[i]);
		if (Bold[i])
		{
			NumGraphs[i]->SetLineWidth(3);
			ActGraphs[i]->SetLineWidth(3);
		}
	}
	NumGraphs[0]->SetLineColor(kBlue);
	if (n==3) NumGraphs[2]->SetLineColor(kGreen+2);
	ActGraphs[0]->SetLineColor(kBlue);
	if (n==3) ActGraphs[2]->SetLineColor(kGreen+2);

	// format and display stack of NumGraphs
	TCanvas* NumCanvas = new TCanvas("NumCanvas","Number of nuclei",600,400);
	NumCanvas->SetGrid();
	NumGraphstack->Draw("ca");
	NumGraphstack->GetXaxis()->SetTitle(Form("Time (%s)",tempname.c_str()));
	NumGraphstack->GetYaxis()->SetTitle("Number on tape");
	NumGraphstack->GetXaxis()->SetRangeUser(0,maxtime/scalefactor);
	if (logscale)
	{
		double yhigh = NumCanvas->GetFrame()->GetY2();
		double ylow = yhigh/2;
		for (int i=0;i<n;i++)
		{
			double x,y;
			NumGraphs[i]->GetPoint(1,x,y);
			if (y<ylow) ylow = y;
			int finalpoint = NumGraphs[i]->GetN();
			NumGraphs[i]->GetPoint(finalpoint-1,x,y);
			if (y<ylow) ylow = y;
		}
		NumGraphstack->GetYaxis()->SetRangeUser(ylow,yhigh);
		NumCanvas->SetLogy(kTRUE);
	}
	NumGraphstack->Draw("ca");
	TLegend* NumLegend = new TLegend(0.12,0.88-n*0.05,0.35,0.88);
	NumLegend->SetFillColor(kWhite);

	TCanvas* ActCanvas = new TCanvas("ActCanvas","Activity from tape",600,400);
	ActCanvas->SetGrid();
	ActGraphstack->Draw("ca");
	if (logscale)
	{
		double yhigh = ActCanvas->GetFrame()->GetY2();
		double ylow = yhigh/2;
		for (int i=0;i<n;i++)
		{
			double x,y;
			ActGraphs[i]->GetPoint(1,x,y);
			if (y<ylow) ylow = y;
			int finalpoint = ActGraphs[i]->GetN();
			ActGraphs[i]->GetPoint(finalpoint-1,x,y);
			if (y<ylow) ylow = y;
		}
		ActGraphstack->GetYaxis()->SetRangeUser(1,yhigh);
		ActCanvas->SetLogy(kTRUE);
	}
	ActGraphstack->GetXaxis()->SetTitle(Form("Time (%s)",tempname.c_str()));
	ActGraphstack->GetYaxis()->SetTitle(Form("Activity on tape (decays/%s)",tempname.c_str()));
	ActGraphstack->GetXaxis()->SetRangeUser(0,maxtime/scalefactor);
	ActGraphstack->Draw("ca");
	TLegend* ActLegend = new TLegend(0.12,0.88-n*0.05,0.35,0.88);
	ActLegend->SetFillColor(kWhite);

	for (int i=0;i<n;i++)
	{
		long int integral_int = (long int)(integrals[i]);
		NumLegend->AddEntry(NumGraphs[i],names[i].c_str(),"l");
		if (integral_int<10000)
		{
			ActLegend->AddEntry(ActGraphs[i],Form("%s: %li decays",names[i].c_str(),integral_int),"l");
		}
		else
		{
			ActLegend->AddEntry(ActGraphs[i],Form("%s: %.2e decays",names[i].c_str(),integrals[i]),"l");
		}
	}

	NumCanvas->cd();
	NumLegend->Draw();
	ActCanvas->cd();
	ActLegend->Draw();

	NumCanvas->SaveAs("number.png");
	ActCanvas->SaveAs("act.png");
}
