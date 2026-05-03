import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('subscriber app', () => {
  it('makes Home a next-visit confidence surface without inventory copy', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Essi Agbodzan', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Besoin de plus ce mois-ci/u })).toBeInTheDocument();
    expect(screen.getByText(/Abonnement actif · T2/u)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mardi 5 mai/u, level: 2 })).toBeInTheDocument();
    expect(screen.getByText('PROCHAINE VISITE')).toBeInTheDocument();
    expect(screen.getByText('Akouvi Koffi')).toBeInTheDocument();
    expect(screen.getByText('À préparer avant mardi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Régulariser' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparer ma visite' })).toBeInTheDocument();
    expect(screen.queryByText('Action requise')).not.toBeInTheDocument();
    expect(screen.queryByText('Préparation de la visite')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Préparer ma visite' }));
    expect(screen.getByText('Préparation de la visite')).toBeInTheDocument();
    expect(screen.getByText('Laveuse confirmée')).toBeInTheDocument();
    expect(screen.getByText('Rappel programmé')).toBeInTheDocument();
    expect(screen.queryByText('Formule')).not.toBeInTheDocument();
    expect(screen.queryByText('Réponse suivie')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reporter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sauter' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Support' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Voir la visite' })).not.toBeInTheDocument();
    expect(screen.queryByText('35 surfaces')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventaire des écrans production')).not.toBeInTheDocument();
  });

  it('opens the Home priority action through the pipeline before changing state', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Régulariser' }));

    expect(screen.getByRole('dialog', { name: 'Régulariser le paiement' })).toBeInTheDocument();
    expect(screen.queryByText('Paiement marqué comme régularisé.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme régularisé' }));

    expect(screen.getByText('Paiement marqué comme régularisé.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparer ma visite' })).toBeInTheDocument();
  });

  it('opens a clear wash-order flow from Home', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Besoin de plus ce mois-ci/u }));

    expect(
      screen.getByRole('dialog', { name: 'Ajouter une visite de lavage' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/confirme le créneau avant de réserver/u)).toBeInTheDocument();
    expect(screen.queryByText('Demande de lavage envoyée.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la demande' }));

    expect(
      screen.getByText('Demande envoyée. Washed confirmera la laveuse et le créneau.'),
    ).toBeInTheDocument();
  });

  it('opens each primary tab as a focused hub', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });

    fireEvent.click(within(nav).getByRole('button', { name: 'Abonnement' }));
    expect(screen.getByRole('heading', { name: "Gestion de l'abonnement" })).toBeInTheDocument();
    expect(screen.getByText('Paiement et reçus')).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: 'Support' }));
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText('Messages relayés par opérateur')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Messages relayés par opérateur/u }));
    expect(
      screen.getByRole('dialog', { name: 'Messages relayés par opérateur' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    fireEvent.click(within(nav).getByRole('button', { name: 'Profil' }));
    expect(screen.getByRole('heading', { name: 'Profil et confidentialité' })).toBeInTheDocument();
    expect(screen.getByText('Droits de confidentialité')).toBeInTheDocument();
  });

  it('confirms visit actions through bottom sheets before reducer feedback appears', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /mardi 19 mai/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprogrammer' }));
    expect(screen.getByRole('dialog', { name: 'Reporter la visite' })).toBeInTheDocument();
    expect(screen.queryByText('Visite marquée pour reprogrammation.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(screen.getByText('Visite marquée pour reprogrammation.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: /Sauter la visite 2 \/ 2/u }));
    expect(screen.getByRole('dialog', { name: 'Sauter la prochaine visite' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser le crédit' }));
    expect(
      screen.getByText('Crédit de saut utilisé pour la prochaine visite.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Demander un remplacement 2 \/ 2/u }));
    expect(screen.getByRole('dialog', { name: 'Changer de laveuse' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Demander le remplacement' }));
    expect(
      screen.getByText('Demande de remplacement envoyée pour validation opérateur.'),
    ).toBeInTheDocument();
  });

  it('confirms payment, cancellation, privacy, and account deletion actions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Régulariser le paiement' }));
    expect(screen.getByRole('dialog', { name: 'Régulariser le paiement' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme régularisé' }));
    expect(screen.getByText('Paiement marqué comme régularisé.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Annuler l'abonnement" }));
    expect(screen.getByRole('dialog', { name: "Annuler l'abonnement" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Demander l'annulation" }));
    expect(
      screen.getByText("Demande d'annulation enregistrée. Le support confirmera la date finale."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }));
    expect(screen.getByRole('dialog', { name: 'Exporter vos données' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Demander l'export" }));
    expect(screen.getByText("Demande d'export confidentialité mise en file.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Demander l'effacement" }));
    expect(screen.getByRole('dialog', { name: "Demander l'effacement" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: "Demander l'effacement" }).at(-1)!);
    expect(
      screen.getByText("Demande d'effacement mise en file pour revue opérateur."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le compte' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer le compte' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Demander la suppression' }));
    expect(
      screen.getByText('Demande de suppression du compte mise en file pour revue opérateur.'),
    ).toBeInTheDocument();
  });

  it('makes support categories reachable from Messages and Visit detail', () => {
    render(<App />);

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', {
        name: 'Support',
      }),
    );
    expect(screen.getByRole('button', { name: /Visite manquée/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Qualité du lavage/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Article abîmé ou manquant/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paiement ou reçu/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Situation sensible/u })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Situation sensible/u }));
    expect(
      screen.getByRole('dialog', { name: 'Signaler un problème de visite' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Situation sensible', pressed: true }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));
    expect(
      screen.getByText('Signalement transmis au support Washed avec le contexte de visite.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    fireEvent.click(screen.getByRole('button', { name: /mardi 19 mai/u }));
    fireEvent.click(screen.getByRole('button', { name: /Note/u }));
    expect(screen.getByRole('dialog', { name: 'Noter la visite' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer 5 étoiles' }));
    expect(
      screen.getByText('Merci. Votre note a été enregistrée pour cette visite.'),
    ).toBeInTheDocument();
  });

  it('keeps billing, inbox, legal, account recovery, and onboarding reachable', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(
      screen.getByRole('heading', { name: 'Boîte de réception et notifications' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paiements' }));
    expect(screen.getByRole('heading', { name: 'Historique de paiement' })).toBeInTheDocument();
    expect(screen.getByText('Crédits support')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: /Conditions et confidentialité/u }));
    expect(
      screen.getByRole('heading', { name: 'Conditions et confidentialité' }),
    ).toBeInTheDocument();
    expect(screen.getByText("Conditions d'utilisation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: /Récupération du compte/u }));
    expect(screen.getByRole('heading', { name: 'Récupération du compte' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: /Départ/u }));
    expect(screen.getByRole('heading', { name: 'Inscription abonnée' })).toBeInTheDocument();
  });

  it('switches the subscriber interface to English', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));

    expect(screen.getByText(/Active plan · T2 · payment needs attention/u)).toBeInTheDocument();
    expect(screen.getByText('Prepare before Tuesday')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Need more this month/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare my visit' })).toBeInTheDocument();
  });
});
