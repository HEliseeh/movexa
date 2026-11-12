package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.domain.CashClosure;
import com.mycompany.myapp.security.AuthoritiesConstants;
import com.mycompany.myapp.service.CashService;
import com.mycompany.myapp.service.PaymentService;
import com.mycompany.myapp.service.dto.DashboardDtos.CashClosureRequest;
import com.mycompany.myapp.service.dto.DashboardDtos.CashDayDTO;
import com.mycompany.myapp.service.dto.PaymentDtos.CancelRequest;
import com.mycompany.myapp.service.dto.PaymentDtos.PaymentDTO;
import com.mycompany.myapp.service.dto.PaymentDtos.PaymentRequest;
import com.mycompany.myapp.service.dto.PaymentDtos.ReceiptDTO;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Encaissements, liens de paiement, reçus et clôture de caisse. */
@RestController
@RequestMapping("/api")
public class PaymentResource {

    private final PaymentService paymentService;
    private final CashService cashService;

    public PaymentResource(PaymentService paymentService, CashService cashService) {
        this.paymentService = paymentService;
        this.cashService = cashService;
    }

    /** GET /api/payments?date=2026-11-12 : paiements saisis ce jour-là (aujourd'hui par défaut). */
    @GetMapping("/payments")
    public List<PaymentDTO> listDay(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return paymentService.listDay(date);
    }

    /** GET /api/payments/links : liens de paiement envoyés ces 60 derniers jours. */
    @GetMapping("/payments/links")
    public List<PaymentDTO> links() {
        return paymentService.listLinks();
    }

    /** POST /api/payments : encaisser (espèces, MoMo, Moov) ou créer un lien de paiement. */
    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentDTO create(@Valid @RequestBody PaymentRequest request) {
        return paymentService.create(request);
    }

    /** Annulation avec motif : réservée au gérant (le réceptionniste demande au gérant). */
    @PostMapping("/payments/{id}/cancel")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public PaymentDTO cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest request) {
        return paymentService.cancel(id, request.reason());
    }

    /** Confirmation manuelle d'un lien payé, si la notification de l'agrégateur n'est pas arrivée. */
    @PostMapping("/payments/{id}/confirm")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public PaymentDTO confirm(@PathVariable Long id) {
        return paymentService.confirmManually(id);
    }

    @GetMapping("/payments/{id}/receipt")
    public ReceiptDTO receipt(@PathVariable Long id) {
        return paymentService.receipt(id);
    }

    /** GET /api/cash?date= : attendu par moyen de paiement, et clôture si elle est faite. */
    @GetMapping("/cash")
    public CashDayDTO cashDay(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return cashService.day(date);
    }

    @PostMapping("/cash/closures")
    @ResponseStatus(HttpStatus.CREATED)
    public CashClosure close(@Valid @RequestBody CashClosureRequest request) {
        return cashService.close(request);
    }
}
